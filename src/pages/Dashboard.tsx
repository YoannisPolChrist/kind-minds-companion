import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  Settings, Calendar, BookOpen, TrendingUp, CheckCircle, ArrowRight,
  BarChart3, Clock, Edit3, FileText, History, HeartPulse, Sparkles,
  Layers, Play, ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem,
  TiltCard, PressableScale,
} from "../components/motion";
import { SkeletonCard, SkeletonMetrics } from "../components/ui/Skeleton";

// ─── Background Images ───────────────────────────────────────────────────────
const HOME_BACKGROUNDS = [
  "/images/HomeUi1.webp",
  "/images/HomeUi2.webp",
  "/images/HomeUi3.webp",
  "/images/HomeUi4.webp",
  "/images/HomeUi5.webp",
  "/images/HomeUi6.webp",
];

const randomBg = HOME_BACKGROUNDS[Math.floor(Math.random() * HOME_BACKGROUNDS.length)];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  title: string;
  completed?: boolean;
  completedAt?: string;
  blocks?: any[];
  recurrence?: string;
  themeColor?: string;
  coverImage?: string;
}

interface Checkin {
  id: string;
  mood: number;
  energy?: number;
  date: string;
  note?: string;
  createdAt?: string;
}

const MOOD_EMOJIS: Record<number, string> = {
  10: "🤩", 9: "🔥", 8: "😊", 7: "🙂", 6: "😌",
  5: "😐", 4: "🤯", 3: "😢", 2: "😫", 1: "😭",
};

// ─── Exercise Card (matching native OpenExerciseCard) ────────────────────────

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const themeColor = exercise.themeColor || "hsl(var(--primary))";
  const blockCount = exercise.blocks?.length ?? 0;
  const estimatedMinutes = blockCount * 3;

  return (
    <motion.div
      className="rounded-3xl border-[1.5px] overflow-hidden bg-card shadow-lg cursor-pointer group"
      style={{ borderColor: `${themeColor}25` }}
      whileHover={{ scale: 1.025, y: -4, boxShadow: `0 16px 40px ${themeColor}30` }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      onClick={onClick}
    >
      {/* Accent bar */}
      <div className="h-1 rounded-t-3xl" style={{ backgroundColor: themeColor }} />

      {/* Cover image */}
      {exercise.coverImage && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={exercise.coverImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/95 to-transparent" />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-card/85 backdrop-blur-sm border border-border/50 flex items-center gap-1.5">
            <Layers size={11} className="text-muted-foreground" />
            <span className="text-[11px] font-extrabold text-muted-foreground">
              {blockCount} {blockCount === 1 ? "Modul" : "Module"}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5 pt-4">
        <h3 className="text-lg font-black text-foreground tracking-tight leading-tight mb-3 line-clamp-2">
          {exercise.title}
        </h3>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {exercise.recurrence && exercise.recurrence !== "none" && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold"
              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
            >
              <Calendar size={12} />
              {exercise.recurrence === "daily" ? "Täglich" : "Wöchentlich"}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-secondary border border-border text-muted-foreground">
            <Clock size={12} />
            {estimatedMinutes} Min
          </span>
          {!exercise.coverImage && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-secondary border border-border text-muted-foreground">
              <Layers size={12} />
              {blockCount} {blockCount === 1 ? "Modul" : "Module"}
            </span>
          )}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between pt-3.5 border-t" style={{ borderColor: `${themeColor}15` }}>
          <span className="text-[15px] font-extrabold tracking-tight" style={{ color: themeColor }}>
            Jetzt starten
          </span>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: themeColor, boxShadow: `0 4px 12px ${themeColor}50` }}
          >
            <Play size={14} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Navigation Card (matching native resource/note/booking cards) ───────────

function NavCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  onClick,
  delay = 0,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <PressableScale onClick={onClick}>
        <div className="bg-card rounded-[28px] border border-border p-6 flex items-center justify-between shadow-sm hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-5 flex-1 pr-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={24} color={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-foreground mb-1">{title}</p>
              <p className="text-[13px] font-medium text-muted-foreground leading-5 line-clamp-2">{description}</p>
            </div>
          </div>
          <div className="p-2.5 rounded-full bg-secondary shrink-0">
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </div>
      </PressableScale>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [nextAppointment, setNextAppointment] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const currentSlot = new Date().getHours() < 12 ? "morning" : "evening";

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      try {
        const globalExSnap = await getDocs(
          query(collection(db, "exercises"), where("clientId", "==", profile.id))
        );
        let exs = globalExSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        if (exs.length === 0) {
          const userExSnap = await getDocs(query(collection(db, "users", profile.id, "exercises")));
          exs = userExSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        }
        setExercises(exs);

        const ciSnap = await getDocs(
          query(collection(db, "checkins"), where("uid", "==", profile.id))
        );
        const allCheckins = ciSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Checkin));
        allCheckins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCheckins(allCheckins.slice(0, 7));

        const slotDocId = `${profile.id}_${today}_${currentSlot}`;
        const slotSnap = await getDoc(doc(db, "checkins", slotDocId));
        if (slotSnap.exists()) {
          setCheckedInToday(true);
        } else {
          const legacySnap = await getDoc(doc(db, "checkins", `${profile.id}_${today}`));
          setCheckedInToday(legacySnap.exists());
        }

        if (profile.therapistId) {
          try {
            const therapistSnap = await getDoc(doc(db, "users", profile.therapistId));
            if (therapistSnap.exists()) {
              const tData = therapistSnap.data();
              if (tData.bookingUrl) setBookingUrl(tData.bookingUrl);
            }
          } catch { }
        }
        if (profile.nextAppointment) {
          setNextAppointment(profile.nextAppointment);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.id]);

  const openExercises = useMemo(() => exercises.filter((e) => !e.completed), [exercises]);
  const completedExercises = useMemo(() => exercises.filter((e) => e.completed), [exercises]);

  // ── Loading skeleton (matching native) ────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton header */}
        <div className="relative rounded-b-[2.5rem] overflow-hidden" style={{ paddingTop: 72, paddingBottom: 56 }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark to-primary" />
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10">
              <div className="h-14 w-48 bg-white/10 rounded-lg mx-auto mb-4 animate-pulse" />
              <div className="h-8 w-56 bg-white/10 rounded-lg mb-3 animate-pulse" />
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonMetrics />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* ── Header with Background Image ────────────────────────────────── */}
      <div className="relative rounded-b-[2.5rem] overflow-hidden shadow-xl mb-4" style={{ boxShadow: "0 12px 40px hsl(var(--primary) / 0.18)" }}>
        {/* Background image */}
        <img
          src={randomBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Foreground glassmorphism card */}
        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-14 pb-8">
          <motion.div
            className="backdrop-blur-xl rounded-[2rem] p-5 sm:p-6 border"
            style={{
              backgroundColor: "rgba(255,255,255,0.75)",
              borderColor: "rgba(0,0,0,0.05)",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 22, stiffness: 100 }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-3">
              <img
                src="/images/logo-transparent.png"
                alt="Logo"
                className="h-14 sm:h-20 object-contain"
              />
            </div>

            {/* Greeting row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 pr-3">
                <motion.h1
                  className="text-2xl sm:text-[34px] font-black text-foreground tracking-tight leading-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                >
                  Hi {profile?.firstName || ""} 👋
                </motion.h1>
              </div>
              <PressableScale onClick={() => navigate("/settings")}>
                <div className="p-3 sm:p-4 rounded-[18px] bg-black/[0.04] border border-black/5 hover:bg-black/[0.08] transition-colors">
                  <Settings size={20} className="text-foreground" />
                </div>
              </PressableScale>
            </div>

            {/* Progress bar */}
            {exercises.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex justify-between text-sm font-bold text-foreground mb-2">
                  <span>Fortschritt</span>
                  <span>{completedExercises.length} / {exercises.length}</span>
                </div>
                <div className="h-2.5 bg-black/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedExercises.length / exercises.length) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-5 pb-10 space-y-5">
        {/* Next Appointment */}
        {nextAppointment && (
          <motion.div
            className="bg-pink-50 border border-pink-100 rounded-3xl p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "timing", duration: 400, delay: 0.1 }}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-11 h-11 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                <Calendar size={24} className="text-pink-600" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-pink-600 uppercase tracking-wide mb-0.5">
                  Nächster Termin
                </p>
                <p className="text-xl font-black text-foreground">
                  {new Date(nextAppointment).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-pink-600 text-white font-extrabold py-3 rounded-2xl hover:bg-pink-700 transition-colors mt-1"
              >
                Termin verwalten
              </a>
            )}
          </motion.div>
        )}

        {/* Check-in Banner (matching native CheckinBanner) */}
        {!checkedInToday ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 22, stiffness: 120, delay: 0.1 }}
          >
            <PressableScale onClick={() => navigate("/checkin")}>
              <div
                className="relative rounded-[2rem] overflow-hidden p-6 flex items-center justify-between"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))",
                  boxShadow: "0 12px 32px hsl(var(--primary) / 0.25)",
                }}
              >
                {/* Decorative circles */}
                <div className="absolute -right-5 -top-5 w-36 h-36 rounded-full bg-white/5" />
                <div className="absolute right-10 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

                <div className="flex items-center gap-5 flex-1 pr-4 relative z-10">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0"
                    animate={{ scale: [0.9, 1, 0.9], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <HeartPulse size={30} className="text-white" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-white/80 text-xs font-extrabold uppercase tracking-[1.5px]">
                        Tages-Check-in
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                      Wie geht es dir?
                    </h3>
                    <p className="text-white/70 text-[13px] font-semibold mt-1">
                      Halte deinen Fortschritt fest
                    </p>
                  </div>
                </div>

                <motion.div
                  className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 relative z-10"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight size={24} className="text-white" />
                </motion.div>
              </div>
            </PressableScale>
          </motion.div>
        ) : (
          <motion.div
            className="rounded-[2rem] overflow-hidden p-6 flex items-center gap-4 border"
            style={{
              background: "linear-gradient(135deg, hsl(160 84% 39% / 0.08), hsl(160 84% 39% / 0.02))",
              borderColor: "hsl(160 84% 39% / 0.2)",
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 120 }}
            onClick={() => navigate("/checkins")}
            role="button"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(160 84% 39% / 0.15)" }}>
              <CheckCircle size={28} className="text-success" />
            </div>
            <div className="flex-1">
              <p className="font-black text-foreground text-lg">Check-in erledigt!</p>
              <p className="text-success text-[13px] font-bold">Auswertung anzeigen →</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles size={24} className="text-success/50" />
            </motion.div>
          </motion.div>
        )}

        {/* Mood Chart */}
        {checkins.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <TiltCard
              className="bg-card rounded-3xl border border-border p-6 shadow-sm cursor-pointer"
              onClick={() => navigate("/checkins")}
              maxTilt={4}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Stimmungsverlauf (letzte 7 Tage)
                </h3>
                <span className="text-xs font-bold text-primary">Alle ansehen →</span>
              </div>
              <div className="flex items-end gap-2 h-24">
                {[...checkins].reverse().map((ci, i) => (
                  <motion.div
                    key={ci.id}
                    className="flex-1 flex flex-col items-center gap-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, type: "spring", damping: 16 }}
                  >
                    <span className="text-lg">{MOOD_EMOJIS[ci.mood] || "😐"}</span>
                    <motion.div
                      className="w-full rounded-lg min-h-[4px]"
                      initial={{ height: 0 }}
                      animate={{ height: `${ci.mood * 10}%` }}
                      transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      style={{
                        background: "linear-gradient(to top, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 100%)",
                      }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(ci.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </motion.div>
        )}

        {/* Navigation Cards (matching native pattern) */}
        <div className="space-y-3">
          {bookingUrl && (
            <NavCard
              icon={Calendar}
              iconColor="hsl(var(--primary))"
              iconBg="hsl(var(--primary) / 0.1)"
              title="Termin buchen"
              description="Vereinbare dein nächstes Coaching"
              onClick={() => window.open(bookingUrl, "_blank")}
              delay={0.1}
            />
          )}
          <NavCard
            icon={BookOpen}
            iconColor="#A78BFA"
            iconBg="rgba(167,139,250,0.12)"
            title="Ressourcen"
            description="Dokumente & Links von deinem Coach"
            onClick={() => navigate("/resources")}
            delay={0.15}
          />
          <NavCard
            icon={Edit3}
            iconColor="#3B82F6"
            iconBg="rgba(59,130,246,0.1)"
            title="Session Notes"
            description="Füge Notizen und Erkenntnisse nach deiner Session hinzu."
            onClick={() => navigate("/notes")}
            delay={0.16}
          />
        </div>

        {/* Stats row */}
        {exercises.length > 0 && (
          <motion.div
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {[
              { label: "Gesamt", value: exercises.length, cls: "text-primary" },
              { label: "Offen", value: openExercises.length, cls: "text-accent" },
              { label: "Erledigt", value: completedExercises.length, cls: "text-success" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm"
                whileHover={{ y: -3, scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.p
                  className={`text-2xl font-black ${s.cls}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, type: "spring", damping: 10, stiffness: 200 }}
                >
                  {s.value}
                </motion.p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Open Exercises */}
        {exercises.length === 0 ? (
          <motion.div
            className="bg-card rounded-3xl border border-border p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.p
              className="text-4xl mb-3"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              📋
            </motion.p>
            <p className="font-bold text-foreground">Keine Aufgaben vorhanden</p>
            <p className="text-sm text-muted-foreground mt-1">Sobald dein Therapeut dir eine Übung zuweist, erscheint sie hier.</p>
          </motion.div>
        ) : (
          <>
            {openExercises.length > 0 && (
              <section>
                <motion.h2
                  className="text-xl font-black text-foreground mb-4 tracking-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Deine Aufgaben
                </motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {openExercises.map((ex, idx) => (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + idx * 0.05 }}
                    >
                      <ExerciseCard exercise={ex} onClick={() => navigate(`/exercise/${ex.id}`)} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {completedExercises.length > 0 && (
              <section>
                <div className="flex items-center gap-4 my-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Erledigt</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {completedExercises.map((ex, idx) => (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + idx * 0.05 }}
                    >
                      <Link
                        to={`/exercise/${ex.id}`}
                        className="block bg-card rounded-3xl border border-border p-5 opacity-70 hover:opacity-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle size={18} className="text-success shrink-0" />
                          <span className="font-bold text-foreground truncate">{ex.title}</span>
                          <span className="ml-auto text-xs text-muted-foreground font-medium whitespace-nowrap">
                            ✓ Erledigt
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Quick links row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/checkins", icon: BarChart3, label: "Tagebuch" },
            { to: "/exercises", icon: BookOpen, label: "Übungen" },
            { to: "/history", icon: History, label: "Verlauf" },
            { to: "/settings", icon: Settings, label: "Einstellungen" },
          ].map(({ to, icon: Icon, label }) => (
            <PressableScale key={to} onClick={() => navigate(to)}>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
                <Icon size={18} className="text-primary shrink-0" />
                <span className="font-bold text-sm text-foreground">{label}</span>
              </div>
            </PressableScale>
          ))}
        </div>

        <div className="h-8" />
      </div>
    </PageTransition>
  );
}
