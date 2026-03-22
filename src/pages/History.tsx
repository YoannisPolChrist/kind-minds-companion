import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore/lite";
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, Lock, NotebookPen } from "lucide-react";
import { motion } from "motion/react";
import { dbLite } from "../lib/firebaseDbLite";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard } from "../components/motion";
import { getRandomHeaderImage } from "../constants/headerImages";

const headerImg = getRandomHeaderImage();

interface HistoryItem {
  id: string;
  type: "exercise" | "checkin";
  title?: string;
  mood?: number;
  date: string;
  completed?: boolean;
  sharedAnswers?: boolean;
}

function groupByWeek(items: HistoryItem[]) {
  const weeks: Record<string, HistoryItem[]> = {};

  items.forEach((item) => {
    const date = new Date(item.date);
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = monday.toISOString().split("T")[0];

    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(item);
  });

  return Object.entries(weeks).sort(([left], [right]) => right.localeCompare(left));
}

function weekLabel(dateString: string, locale: string) {
  const start = new Date(dateString);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })} - ${end.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "2-digit",
  })}`;
}

function moodTone(mood?: number) {
  if (!mood || mood <= 0) return "bg-secondary text-muted-foreground border-border";
  if (mood <= 3) return "bg-destructive/10 text-destructive border-destructive/20";
  if (mood <= 6) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-success/10 text-success border-success/20";
}

export default function History() {
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    void (async () => {
      try {
        const [exerciseSnapshot, checkinSnapshot] = await Promise.all([
          getDocs(query(collection(dbLite, "exercises"), where("clientId", "==", profile.id), where("completed", "==", true))),
          getDocs(query(collection(dbLite, "checkins"), where("uid", "==", profile.id))),
        ]);

        const exercises: HistoryItem[] = exerciseSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: "exercise",
            title: data.title,
            date: data.lastCompletedAt || data.completedAt || data.createdAt || new Date().toISOString(),
            completed: true,
            sharedAnswers: data.sharedAnswers,
          };
        });

        const checkins: HistoryItem[] = checkinSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: "checkin",
            mood: data.mood,
            date: data.createdAt || data.date || new Date().toISOString(),
          };
        });

        setItems(
          [...exercises, ...checkins].sort(
            (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
          )
        );
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const grouped = useMemo(() => groupByWeek(items), [items]);
  const completedExercises = useMemo(() => items.filter((item) => item.type === "exercise").length, [items]);
  const checkinCount = useMemo(() => items.filter((item) => item.type === "checkin").length, [items]);
  const latestEntry = items[0];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary-dark to-primary text-primary-foreground">
        <img src={headerImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />

        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-12">
          <motion.button
            onClick={() => navigate("/")}
            className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/25"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            Zurück
          </motion.button>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight">Verlauf</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Zusammenfassung</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: "Gesamt", value: items.length, icon: Calendar },
                { label: "Check-ins", value: checkinCount, icon: NotebookPen },
                { label: "Erledigte Übungen", value: completedExercises, icon: BookOpen },
              ].map((entry) => {
                const Icon = entry.icon;

                return (
                  <div key={entry.label} className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-primary">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-foreground">{entry.value}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{entry.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Letzter Eintrag</p>
            {latestEntry ? (
              <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
                <p className="text-sm font-black text-foreground">
                  {latestEntry.type === "checkin" ? "Check-in" : latestEntry.title || "Übung"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(latestEntry.date).toLocaleString(locale, {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Sobald du Check-ins oder erledigte Übungen hast, erscheint hier dein letzter Eintrag.
              </p>
            )}
          </div>
        </aside>

        <section>
          {items.length === 0 ? (
            <div className="rounded-[2rem] border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
                <Calendar size={28} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-foreground">Noch kein Verlauf vorhanden</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                Hier erscheint bald deine Übersicht aus Check-ins und erledigten Übungen.
              </p>
            </div>
          ) : (
            <StaggerContainer className="space-y-6">
              {grouped.map(([weekStart, weekItems]) => (
                <StaggerItem key={weekStart}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
                      <Calendar size={12} className="text-primary" />
                    <span className="text-xs font-black text-foreground">{weekLabel(weekStart, locale)}</span>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-3 border-l-2 border-border pl-4">
                    {weekItems.map((item) => (
                      <TiltCard
                        key={item.id}
                        className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm"
                        onClick={() =>
                          item.type === "exercise" ? navigate(`/exercise/${item.id}`) : navigate("/checkins")
                        }
                        maxTilt={3}
                      >
                        <div className="flex items-center gap-3">
                          {item.type === "checkin" ? (
                            <div
                              className={`inline-flex min-w-[72px] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-black ${moodTone(item.mood)}`}
                            >
                              {(item.mood || 0)}/10
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                              <CheckCircle2 size={22} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-foreground">
                              {item.type === "checkin" ? `Check-in (${item.mood || 0}/10)` : item.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {new Date(item.date).toLocaleDateString(locale, {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                              {" | "}
                          {new Date(item.date).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {item.type === "exercise" && item.sharedAnswers === false && (
                            <Lock size={14} className="shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      </TiltCard>
                    ))}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
