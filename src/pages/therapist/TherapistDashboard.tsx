import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  Users, BookOpen, FileText, LayoutTemplate, Plus, Search, ArrowRight,
  Activity, CheckCircle, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs,
  TiltCard, PressableScale,
} from "../../components/motion";
import { Toast, BannerToast } from "../../components/ui/Toast";
import { SkeletonCard, SkeletonMetrics } from "../../components/ui/Skeleton";
import { Badge } from "../../components/ui/Badge";

interface Client {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isArchived?: boolean;
}

export default function TherapistDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Client Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  // Stats
  const [exerciseCount, setExerciseCount] = useState(0);
  const [checkinCount, setCheckinCount] = useState(0);

  // Feedback
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const clientSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))
        );
        const rawClients = clientSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Client))
          .filter((c) => !c.isArchived);
        setClients(rawClients);

        const [exSnap, ciSnap] = await Promise.all([
          getDocs(query(collection(db, "exercises"), where("therapistId", "==", profile.id))),
          getDocs(query(collection(db, "checkins"), where("uid", "in", rawClients.map((c) => c.id).slice(0, 10) || ["__none__"]))),
        ]);
        setExerciseCount(exSnap.size);
        setCheckinCount(ciSnap.size);
      } catch (e) {
        console.error("Error loading therapist data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(q) ||
      c.lastName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const handleAddClient = async () => {
    if (!newFirstName.trim() || !newLastName.trim()) return;
    setAdding(true);
    try {
      const { doc, setDoc } = await import("firebase/firestore");

      const tempEmail = newEmail.trim() || `${newFirstName.toLowerCase()}.${newLastName.toLowerCase()}@therapie-app.de`;
      const newId = crypto.randomUUID();
      await setDoc(doc(db, "users", newId), {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        email: tempEmail,
        role: "client",
        therapistId: profile?.id,
        createdAt: new Date().toISOString(),
      });

      setClients((prev) => [
        ...prev,
        { id: newId, firstName: newFirstName.trim(), lastName: newLastName.trim(), email: tempEmail },
      ]);
      setShowAddModal(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setToast({ visible: true, message: "Klient angelegt!", subMessage: `${newFirstName.trim()} ${newLastName.trim()} wurde hinzugefügt.`, type: "success" });
    } catch (e) {
      console.error("Error adding client:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Klient konnte nicht angelegt werden.", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
          <HeaderOrbs />
          <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
            <div className="h-8 w-48 bg-white/20 rounded-2xl mb-2" />
            <div className="h-4 w-32 bg-white/10 rounded-xl mb-6" />
            <SkeletonMetrics />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-16" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <HeaderOrbs />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 relative z-10">
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Therapeuten-Dashboard
              </h1>
              <p className="text-white/60 text-sm font-medium mt-1">
                Hallo {profile?.firstName || "Therapeut"} — {clients.length} aktive Klienten
              </p>
            </div>
            <PressableScale onClick={() => navigate("/settings")}>
              <div className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors">
                <Users size={20} />
              </div>
            </PressableScale>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Klienten", value: clients.length, icon: Users },
              { label: "Übungen", value: exerciseCount, icon: BookOpen },
              { label: "Check-ins", value: checkinCount, icon: Activity },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm"
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.06, type: "spring", damping: 18 }}
              >
                <s.icon size={18} className="mx-auto mb-1 text-white/70" />
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs font-bold text-white/50 uppercase">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Quick Navigation */}
        <StaggerItem>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: "/therapist/templates", icon: LayoutTemplate, label: "Vorlagen", color: "#6366F1" },
              { to: "/therapist/resources", icon: FileText, label: "Bibliothek", color: "#C09D59" },
              { to: "/exercises", icon: BookOpen, label: "Übungen", color: "#F97316" },
              { to: "/checkins", icon: Activity, label: "Check-ins", color: "#10B981" },
            ].map(({ to, icon: Icon, label, color }) => (
              <PressableScale key={to} onClick={() => navigate(to)}>
                <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <span className="font-bold text-sm text-foreground">{label}</span>
                </div>
              </PressableScale>
            ))}
          </div>
        </StaggerItem>

        {/* Search + Add Client */}
        <StaggerItem>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Klienten suchen..."
                className="w-full pl-11 pr-4 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <motion.button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Klient hinzufügen</span>
            </motion.button>
          </div>
        </StaggerItem>

        {/* Client List */}
        <StaggerItem>
          <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Meine Klienten
            <Badge variant="muted">{clients.length}</Badge>
          </h2>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border p-10 text-center">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Users size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <p className="font-bold text-foreground text-lg mb-1">
                {search ? "Kein Klient gefunden" : "Noch keine Klienten"}
              </p>
              <p className="text-sm text-muted-foreground">
                {search ? "Versuche einen anderen Suchbegriff." : "Füge deinen ersten Klienten hinzu."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((client) => (
                <TiltCard
                  key={client.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/therapist/client/${client.id}`)}
                  maxTilt={4}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-black text-primary shrink-0">
                      {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground shrink-0" />
                  </div>
                </TiltCard>
              ))}
            </div>
          )}
        </StaggerItem>

        <div className="h-8" />
      </StaggerContainer>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">Klient hinzufügen</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Vorname *</label>
                    <input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Max" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nachname *</label>
                    <input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Mustermann" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">E-Mail (optional)</label>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="max@beispiel.de" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="p-6 pt-0">
                <motion.button onClick={handleAddClient} disabled={adding || !newFirstName.trim() || !newLastName.trim()} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {adding ? (
                    <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  ) : (
                    <><Plus size={18} /> Klient anlegen</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
