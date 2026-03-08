import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  Users, FileText, LayoutTemplate, Settings,
  Activity, ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  PressableScale, CountUp,
} from "../../components/motion";
import { getRandomHeaderImage } from "../../constants/headerImages";

const headerImg = getRandomHeaderImage();

interface QuickStat {
  label: string;
  value: number;
  emoji: string;
}

interface RecentActivity {
  id: string;
  type: "exercise" | "checkin" | "note";
  clientName: string;
  clientId?: string;
  title: string;
  date: string;
}

export default function TherapistDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const clientSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))
        );
        const clients = clientSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(c => !c.isArchived);

        const clientIds = clients.map(c => c.id);
        const safeClientIds = clientIds.length > 0 ? clientIds.slice(0, 10) : ["__none__"];

        const [exSnap, ciSnap, notesSnap] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("therapistId", "==", profile.id))),
          getDocs(query(collection(db, "checkins"), where("uid", "in", safeClientIds))),
          getDocs(query(collection(db, "client_notes"), where("clientId", "in", safeClientIds))),
        ]);

        const completedExercises = exSnap.docs.filter(d => d.data().completed).length;
        const sessionNotes = notesSnap.docs.filter(d => d.data().authorRole === "therapist");

        setStats([
          { label: "Klienten", value: clients.length, emoji: "👥" },
          { label: "Übungen", value: exSnap.size, emoji: "📋" },
          { label: "Erledigt", value: completedExercises, emoji: "✅" },
          { label: "Notes", value: sessionNotes.length, emoji: "📝" },
        ]);

        const activities: RecentActivity[] = [];
        exSnap.docs.slice(0, 5).forEach(d => {
          const data = d.data();
          const client = clients.find(c => c.id === data.clientId);
          if (client) {
            activities.push({
              id: d.id, type: "exercise",
              clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
              clientId: data.clientId,
              title: data.title || "Übung",
              date: data.createdAt || data.assignedAt || "",
            });
          }
        });
        sessionNotes.sort((a, b) => new Date(b.data().createdAt || 0).getTime() - new Date(a.data().createdAt || 0).getTime());
        sessionNotes.slice(0, 5).forEach(d => {
          const data = d.data();
          const client = clients.find(c => c.id === data.clientId);
          if (client) {
            activities.push({
              id: d.id, type: "note",
              clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
              clientId: data.clientId,
              title: data.title || "Session Note",
              date: data.sessionDate || data.createdAt || "",
            });
          }
        });
        activities.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setRecentActivity(activities.slice(0, 6));
      } catch (e) {
        console.error("Error loading dashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const navCards = [
    {
      path: "/therapist/clients",
      icon: Users,
      label: "Klienten",
      desc: "Alle Klienten verwalten",
      gradient: "from-primary to-primary-dark",
    },
    {
      path: "/therapist/templates",
      icon: LayoutTemplate,
      label: "Vorlagen",
      desc: "Übungen erstellen & verwalten",
      gradient: "from-accent to-accent/80",
    },
    {
      path: "/therapist/resources",
      icon: FileText,
      label: "Bibliothek",
      desc: "Ressourcen & Materialien",
      gradient: "from-success to-success/80",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
          <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
          <HeaderOrbs />
          <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
            <div className="h-10 w-64 bg-white/20 rounded-2xl mb-3 animate-pulse" />
            <div className="h-5 w-40 bg-white/10 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-2xl border border-border p-6 h-24 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="bg-card rounded-3xl border border-border p-8 h-48 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/30 to-primary/40" />
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div>
              <motion.p className="text-white/50 text-sm font-bold uppercase tracking-wider mb-1"
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {greeting()} 👋
              </motion.p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {profile?.firstName || "Therapeut"}
              </h1>
              <p className="text-white/60 text-sm font-medium mt-1">
                Dein Therapie-Dashboard
              </p>
            </div>
            <PressableScale onClick={() => navigate("/settings")}>
              <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
                <Settings size={20} />
              </div>
            </PressableScale>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2.5">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center"
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", damping: 16 }}
              >
                <span className="text-xl block mb-0.5">{s.emoji}</span>
                <CountUp to={s.value} className="text-xl font-black text-white block" duration={1.2} />
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Navigation Cards — clean, icon-driven */}
        <StaggerItem>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {navCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.path}
                  onClick={() => navigate(card.path)}
                  className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md hover:border-primary/25 transition-all text-left group relative overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, type: "spring", damping: 18 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Subtle gradient accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-foreground leading-tight">{card.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </StaggerItem>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <StaggerItem>
            <h2 className="text-lg font-black text-foreground mb-3 flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Letzte Aktivitäten
            </h2>
            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
              {recentActivity.map((act, i) => (
                <motion.div
                  key={act.id + act.type}
                  className={`flex items-center gap-4 px-5 py-4 ${i < recentActivity.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/50 transition-colors cursor-pointer`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  onClick={() => {
                    if (act.type === "note" && act.clientId) navigate(`/therapist/client/${act.clientId}/notes`);
                    else if (act.clientId) navigate(`/therapist/client/${act.clientId}`);
                  }}
                >
                  <span className="text-xl">{act.type === "exercise" ? "📋" : act.type === "note" ? "📝" : "📊"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{act.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{act.clientName}</p>
                  </div>
                  {act.date && (
                    <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                      {new Date(act.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                  <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                </motion.div>
              ))}
            </div>
          </StaggerItem>
        )}

        <div className="h-8" />
      </StaggerContainer>
    </PageTransition>
  );
}
