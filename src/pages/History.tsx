import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, CheckCircle, Calendar, Lock } from "lucide-react";
import { motion } from "motion/react";
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

const MOOD_EMOJIS: Record<number, string> = {
  10: "🤩", 9: "🔥", 8: "😊", 7: "🙂", 6: "😌",
  5: "😐", 4: "🤯", 3: "😢", 2: "😫", 1: "😭",
};

function groupByWeek(items: HistoryItem[]) {
  const weeks: Record<string, HistoryItem[]> = {};
  items.forEach((item) => {
    const d = new Date(item.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().split("T")[0];
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(item);
  });
  return Object.entries(weeks).sort(([a], [b]) => b.localeCompare(a));
}

function weekLabel(dateStr: string) {
  const d = new Date(dateStr);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" })}`;
}

export default function History() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const [exSnap, ciSnap] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("clientId", "==", profile.id), where("completed", "==", true))),
          getDocs(query(collection(db, "checkins"), where("uid", "==", profile.id))),
        ]);

        const exercises: HistoryItem[] = exSnap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, type: "exercise", title: data.title, date: data.lastCompletedAt || data.completedAt || data.createdAt || new Date().toISOString(), completed: true, sharedAnswers: data.sharedAnswers };
        });

        const checkins: HistoryItem[] = ciSnap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, type: "checkin", mood: data.mood, date: data.createdAt || data.date || new Date().toISOString() };
        });

        const all = [...exercises, ...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setItems(all);
      } catch (e) {
        console.error("Error fetching history:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const grouped = useMemo(() => groupByWeek(items), [items]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/60 to-primary/50" />
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-8 relative z-10">
          <motion.button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-5"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} /> Zurück
          </motion.button>
          <h1 className="text-3xl font-black tracking-tight">Verlauf</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">{items.length} Aktivitäten</p>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {items.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">Noch kein Verlauf</h2>
              <p className="text-muted-foreground">Hier siehst du bald alle erledigten Übungen und Check-ins.</p>
            </div>
          </StaggerItem>
        ) : (
          grouped.map(([weekStart, weekItems]) => (
            <StaggerItem key={weekStart}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-1.5 rounded-full">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-black text-foreground">{weekLabel(weekStart)}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="space-y-2.5 pl-4 border-l-2 border-border">
                {weekItems.map((item, i) => (
                  <TiltCard
                    key={item.id}
                    className="bg-card rounded-2xl border border-border p-4 shadow-sm cursor-pointer"
                    onClick={() => item.type === "exercise" ? navigate(`/exercise/${item.id}`) : navigate("/checkins")}
                    maxTilt={3}
                  >
                    <div className="flex items-center gap-3">
                      {item.type === "checkin" ? (
                        <span className="text-2xl">{MOOD_EMOJIS[item.mood || 5] || "😐"}</span>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                          <CheckCircle size={18} className="text-success" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {item.type === "checkin" ? `Check-in (${item.mood}/10)` : item.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold">
                          {new Date(item.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                          {" · "}
                          {new Date(item.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {item.type === "exercise" && item.sharedAnswers === false && (
                        <Lock size={14} className="text-muted-foreground" />
                      )}
                    </div>
                  </TiltCard>
                ))}
              </div>
            </StaggerItem>
          ))
        )}
        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
