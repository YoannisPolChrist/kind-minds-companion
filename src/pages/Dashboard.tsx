import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  Settings, Calendar, BookOpen, TrendingUp, CheckCircle, ArrowRight,
  BarChart3, Clock, Edit3, FileText, History,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem,
  TiltCard, HeaderOrbs, PressableScale,
} from "../components/motion";

interface Exercise {
  id: string;
  title: string;
  completed?: boolean;
  completedAt?: string;
  blocks?: any[];
  recurrence?: string;
  themeColor?: string;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-10 relative z-10">
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hi {profile?.firstName || "dort"} 👋
              </h1>
              <p className="text-white/60 text-sm font-medium mt-1">
                {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <PressableScale onClick={() => navigate("/settings")}>
              <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
                <Settings size={20} />
              </div>
            </PressableScale>
          </motion.div>

          {nextAppointment && (
            <motion.div
              className="bg-white/10 rounded-2xl p-4 mb-4 flex items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", damping: 18 }}
            >
              <Calendar size={18} className="text-white/70 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white/50 uppercase">Nächster Termin</p>
                <p className="font-bold text-white">
                  {new Date(nextAppointment).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {bookingUrl && (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl hover:bg-white/30 transition-colors"
                >
                  Umbuchen
                </a>
              )}
            </motion.div>
          )}

          {exercises.length > 0 && (
            <motion.div
              className="bg-white/10 rounded-2xl p-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: "spring", damping: 18 }}
            >
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Fortschritt</span>
                <span>{completedExercises.length} / {exercises.length}</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedExercises.length / exercises.length) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Check-in Banner */}
        <StaggerItem>
          {!checkedInToday ? (
            <PressableScale onClick={() => navigate("/checkin")}>
              <Link
                to="/checkin"
                className="block bg-gradient-to-r from-accent to-amber-500 rounded-3xl p-6 shadow-lg shadow-accent/20 group"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0"
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    💭
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white">Wie geht es dir heute?</h3>
                    <p className="text-white/70 text-sm font-medium">Tägliches Check-in ausfüllen</p>
                  </div>
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="text-white/60" size={24} />
                  </motion.div>
                </div>
              </Link>
            </PressableScale>
          ) : (
            <motion.div
              className="bg-success/10 border border-success/20 rounded-3xl p-5 flex items-center gap-4"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <CheckCircle className="text-success shrink-0" size={28} />
              </motion.div>
              <div>
                <p className="font-bold text-foreground">Check-in erledigt! ✓</p>
                <p className="text-sm text-muted-foreground">
                  {currentSlot === "morning" ? "Abend-Check-in ab 12:00 verfügbar." : "Morgen wieder verfügbar."}
                </p>
              </div>
            </motion.div>
          )}
        </StaggerItem>

        {/* Recent Mood Chart */}
        {checkins.length > 1 && (
          <StaggerItem>
            <TiltCard
              className="bg-card rounded-3xl border border-border p-6 shadow-sm cursor-pointer"
              onClick={() => navigate("/checkins")}
              maxTilt={4}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Stimmungsverlauf (letzte 7 Tage)
                </h3>
                <span className="text-xs font-bold text-primary">
                  Alle ansehen →
                </span>
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
                        background: `linear-gradient(to top, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 100%)`,
                      }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(ci.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </motion.div>
                ))}
              </div>
            </TiltCard>
          </StaggerItem>
        )}

        {/* Stats row */}
        <StaggerItem>
          <div className="grid grid-cols-3 gap-3">
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
          </div>
        </StaggerItem>

        {/* Quick Links */}
        <StaggerItem>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: "/checkins", icon: BarChart3, label: "Tagebuch" },
              { to: "/exercises", icon: BookOpen, label: "Übungen" },
              { to: "/notes", icon: Edit3, label: "Notizen" },
              { to: "/resources", icon: FileText, label: "Bibliothek" },
            ].map(({ to, icon: Icon, label }) => (
              <PressableScale key={to} onClick={() => navigate(to)}>
                <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
                  <Icon size={18} className="text-primary shrink-0" />
                  <span className="font-bold text-sm text-foreground">{label}</span>
                </div>
              </PressableScale>
            ))}
          </div>
        </StaggerItem>

        {/* Open Exercises */}
        <StaggerItem>
          <section>
            <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              Deine Aufgaben
            </h2>
            {openExercises.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border p-8 text-center">
                <motion.p
                  className="text-4xl mb-3"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  📋
                </motion.p>
                <p className="font-bold text-foreground">Keine Aufgaben vorhanden</p>
                <p className="text-sm text-muted-foreground mt-1">Sobald dein Therapeut dir eine Übung zuweist, erscheint sie hier.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openExercises.map((ex, i) => (
                  <TiltCard
                    key={ex.id}
                    className="bg-card rounded-2xl border border-border p-5 cursor-pointer shadow-sm hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/exercise/${ex.id}`)}
                    maxTilt={4}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: (ex.themeColor || "hsl(var(--primary))") + "20" }}
                      >
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{ex.title}</h3>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                          {ex.blocks?.length || 0} Module
                          {ex.recurrence === "daily" && " · 🔁 Täglich"}
                          {ex.recurrence === "weekly" && " · 🔁 Wöchentlich"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        Start →
                      </span>
                    </div>
                  </TiltCard>
                ))}
              </div>
            )}
          </section>
        </StaggerItem>

        {/* Completed Exercises */}
        {completedExercises.length > 0 && (
          <StaggerItem>
            <section>
              <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-success" />
                Erledigte Aufgaben
              </h2>
              <div className="space-y-3">
                {completedExercises.map((ex) => (
                  <Link
                    key={ex.id}
                    to={`/exercise/${ex.id}`}
                    className="block bg-card rounded-2xl border border-border p-4 opacity-75 hover:opacity-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle size={18} className="text-success shrink-0" />
                      <span className="font-semibold text-foreground truncate">{ex.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground font-medium whitespace-nowrap">
                        ✓ Erledigt
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </StaggerItem>
        )}

        {/* History Link */}
        <StaggerItem>
          <PressableScale onClick={() => navigate("/history")}>
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm text-center">
              <div className="flex items-center justify-center gap-2">
                <History size={18} className="text-primary" />
                <span className="font-bold text-foreground">Gesamter Verlauf anzeigen</span>
              </div>
            </div>
          </PressableScale>
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
