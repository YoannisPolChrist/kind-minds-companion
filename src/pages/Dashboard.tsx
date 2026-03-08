import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  Settings, Calendar, BookOpen, TrendingUp, CheckCircle, ArrowRight,
  BarChart3, Clock,
} from "lucide-react";

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

  const today = new Date().toISOString().split("T")[0];
  const currentSlot = new Date().getHours() < 12 ? "morning" : "evening";

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      try {
        // Fetch exercises (try global collection, then user-scoped)
        const globalExSnap = await getDocs(
          query(collection(db, "exercises"), where("clientId", "==", profile.id))
        );
        let exs = globalExSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));

        if (exs.length === 0) {
          const userExSnap = await getDocs(
            query(collection(db, "users", profile.id, "exercises"))
          );
          exs = userExSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise));
        }
        setExercises(exs);

        // Fetch recent checkins
        const ciSnap = await getDocs(
          query(collection(db, "checkins"), where("uid", "==", profile.id))
        );
        const allCheckins = ciSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Checkin));
        allCheckins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const cis = allCheckins.slice(0, 7);
        setCheckins(cis);

        // Check today's status
        const slotDocId = `${profile.id}_${today}_${currentSlot}`;
        const slotSnap = await getDoc(doc(db, "checkins", slotDocId));
        if (slotSnap.exists()) {
          setCheckedInToday(true);
        } else {
          const legacySnap = await getDoc(doc(db, "checkins", `${profile.id}_${today}`));
          setCheckedInToday(legacySnap.exists());
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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hi {profile?.firstName || "dort"} 👋
              </h1>
              <p className="text-white/60 text-sm font-medium mt-1">
                {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Progress bar */}
          {exercises.length > 0 && (
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Fortschritt</span>
                <span>{completedExercises.length} / {exercises.length}</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${(completedExercises.length / exercises.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* Check-in Banner */}
        {!checkedInToday ? (
          <Link
            to="/checkin"
            className="block bg-gradient-to-r from-accent to-amber-500 rounded-3xl p-6 shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
                💭
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-white">Wie geht es dir heute?</h3>
                <p className="text-white/70 text-sm font-medium">Tägliches Check-in ausfüllen</p>
              </div>
              <ArrowRight className="text-white/60 group-hover:translate-x-1 transition-transform" size={24} />
            </div>
          </Link>
        ) : (
          <div className="bg-success/10 border border-success/20 rounded-3xl p-5 flex items-center gap-4">
            <CheckCircle className="text-success shrink-0" size={28} />
            <div>
              <p className="font-bold text-foreground">Check-in erledigt! ✓</p>
              <p className="text-sm text-muted-foreground">
                {currentSlot === "morning" ? "Abend-Check-in ab 12:00 verfügbar." : "Morgen wieder verfügbar."}
              </p>
            </div>
          </div>
        )}

        {/* Recent Mood Chart */}
        {checkins.length > 1 && (
          <Link
            to="/checkins"
            className="block bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Stimmungsverlauf (letzte 7 Tage)
              </h3>
              <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                Alle ansehen →
              </span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {[...checkins].reverse().map((ci) => (
                <div key={ci.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-lg">{MOOD_EMOJIS[ci.mood] || "😐"}</span>
                  <div
                    className="w-full bg-primary/20 rounded-lg min-h-[4px] transition-all"
                    style={{ height: `${ci.mood * 10}%` }}
                  />
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {new Date(ci.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </Link>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Gesamt", value: exercises.length, cls: "text-primary" },
            { label: "Offen", value: openExercises.length, cls: "text-accent" },
            { label: "Erledigt", value: completedExercises.length, cls: "text-success" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
              <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/checkins" className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <BarChart3 size={20} className="text-primary shrink-0" />
            <span className="font-bold text-sm text-foreground">Mein Tagebuch</span>
          </Link>
          <Link to="/exercises" className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <BookOpen size={20} className="text-primary shrink-0" />
            <span className="font-bold text-sm text-foreground">Alle Übungen</span>
          </Link>
        </div>

        {/* Open Exercises */}
        <section>
          <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            Deine Aufgaben
          </h2>
          {openExercises.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-foreground">Keine Aufgaben vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">Sobald dein Therapeut dir eine Übung zuweist, erscheint sie hier.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openExercises.map((ex) => (
                <Link
                  key={ex.id}
                  to={`/exercise/${ex.id}`}
                  className="block bg-card rounded-2xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: (ex.themeColor || "#137386") + "20" }}
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
                    <span className="text-sm font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                      Start →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Completed Exercises */}
        {completedExercises.length > 0 && (
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
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
