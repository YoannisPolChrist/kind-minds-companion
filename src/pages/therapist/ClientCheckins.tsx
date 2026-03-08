import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  ArrowLeft, Calendar, Activity,
} from "lucide-react";
import { motion } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard } from "../../components/motion";
import { getRandomHeaderImage } from "../../constants/headerImages";

const headerImg = getRandomHeaderImage();

const MOOD_EMOJIS: Record<number, string> = {
  10: "🤩", 9: "🔥", 8: "😊", 7: "🙂", 6: "😌",
  5: "😐", 4: "🤯", 3: "😢", 2: "😫", 1: "😭",
};

export default function ClientCheckins() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "checkins"), where("uid", "==", id)));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => {
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
  }, [id]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    checkins.forEach((ci: any) => {
      const dateStr = ci.createdAt || ci.date || new Date().toISOString();
      const key = new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(ci);
    });
    return Object.entries(groups);
  }, [checkins]);

  // Analytics
  const avgMood = checkins.length > 0 ? (checkins.reduce((s: number, c: any) => s + (c.mood || 5), 0) / checkins.length).toFixed(1) : "—";
  const avgEnergy = checkins.length > 0 ? (checkins.reduce((s: number, c: any) => s + (c.energy || 5), 0) / checkins.length).toFixed(1) : "—";

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
        <HeaderOrbs />
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <motion.button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold mb-5" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
            <ArrowLeft size={16} /> Zurück
          </motion.button>
          <h1 className="text-2xl font-black tracking-tight">Stimmungs-Tagebuch</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">{checkins.length} Check-ins</p>
        </div>
      </div>

      <StaggerContainer className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Analytics */}
        {checkins.length > 0 && (
          <StaggerItem>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-primary">{avgMood}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase">Ø Stimmung</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-accent">{avgEnergy}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase">Ø Energie</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
                <p className="text-2xl font-black text-success">{checkins.length}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase">Gesamt</p>
              </div>
            </div>
          </StaggerItem>
        )}

        {/* Mood Chart - simple bar visualization */}
        {checkins.length > 1 && (
          <StaggerItem>
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Stimmungsverlauf</h3>
              <div className="flex items-end gap-1 h-28">
                {checkins.slice(0, 30).reverse().map((ci: any, i: number) => (
                  <motion.div
                    key={ci.id}
                    className="flex-1 rounded-t-md min-h-[4px]"
                    initial={{ height: 0 }}
                    animate={{ height: `${(ci.mood || 5) * 10}%` }}
                    transition={{ delay: i * 0.02, duration: 0.4 }}
                    style={{ background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.3))` }}
                    title={`${ci.mood}/10 - ${new Date(ci.createdAt || ci.date).toLocaleDateString("de-DE")}`}
                  />
                ))}
              </div>
            </div>
          </StaggerItem>
        )}

        {checkins.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <Activity size={48} className="text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-black text-foreground mb-2">Keine Check-ins</h2>
              <p className="text-muted-foreground">Der Klient hat noch keinen Check-in durchgeführt.</p>
            </div>
          </StaggerItem>
        ) : (
          grouped.map(([dateTitle, items]) => (
            <StaggerItem key={dateTitle}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-1.5 rounded-full">
                  <Calendar size={12} className="text-primary" />
                  <span className="text-xs font-black text-foreground">{dateTitle}</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2.5 pl-4 border-l-2 border-border">
                {items.map((ci: any) => (
                  <div key={ci.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{MOOD_EMOJIS[ci.mood] || "😐"}</span>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">Stimmung: {ci.mood}/10</p>
                        {ci.energy && <p className="text-xs text-muted-foreground">Energie: {ci.energy}/10</p>}
                        {ci.note && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ci.note}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ci.createdAt && new Date(ci.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {ci.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {ci.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
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
