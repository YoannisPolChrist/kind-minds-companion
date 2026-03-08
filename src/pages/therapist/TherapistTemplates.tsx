import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, Send, Search, X, LayoutTemplate, FileText, Palette,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard, PressableScale } from "../../components/motion";

const THEME_COLORS = ["#137386", "#3B82F6", "#8B5CF6", "#EC4899", "#F43F5E", "#F59E0B", "#10B981", "#64748B"];

export default function TherapistTemplates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Assign modal
  const [assignTemplate, setAssignTemplate] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const [tplSnap, clientSnap] = await Promise.all([
          getDocs(query(collection(db, "exercise_templates"), where("therapistId", "==", profile.id))),
          getDocs(query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))),
        ]);
        setTemplates(tplSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isArchived));
        setClients(clientSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c: any) => !c.isArchived));
      } catch (e) {
        console.error("Error loading templates:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    return t.title?.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "exercise_templates", deleteTarget.id));
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting template:", e);
    }
  };

  const handleAssign = async () => {
    if (!assignTemplate || !selectedClientId) return;
    setAssigning(true);
    try {
      await addDoc(collection(db, "exercises"), {
        clientId: selectedClientId,
        therapistId: profile?.id,
        title: assignTemplate.title,
        blocks: assignTemplate.blocks || [],
        themeColor: assignTemplate.themeColor || null,
        recurrence: "none",
        completed: false,
        createdAt: new Date().toISOString(),
      });
      setAssignTemplate(null);
      setSelectedClientId(null);
    } catch (e) {
      console.error("Error assigning:", e);
    } finally {
      setAssigning(false);
    }
  };

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
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate("/therapist")} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={() => navigate("/therapist/template/new")} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> Neue Vorlage
            </motion.button>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Übungsvorlagen</h1>
          <p className="text-white/70 text-sm font-medium mt-1">Erstelle und verwalte interaktive Vorlagen für deine Klienten.</p>

          <div className="mt-6 relative">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vorlagen durchsuchen..." className="w-full pl-12 pr-10 py-4 bg-white/15 border border-white/25 rounded-2xl text-white font-bold placeholder-white/50 focus:outline-none text-lg" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/15 p-1.5 rounded-lg">
                <X size={16} className="text-white/80" />
              </button>
            )}
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="bg-card rounded-3xl border border-border p-12 text-center">
              <LayoutTemplate size={48} className="text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-black text-foreground mb-2">{search ? "Keine Treffer" : "Noch keine Vorlagen"}</h2>
              <p className="text-muted-foreground text-sm mb-6">Erstelle deine erste Übungsvorlage um loszulegen.</p>
              {!search && (
                <motion.button onClick={() => navigate("/therapist/template/new")} className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2" whileHover={{ scale: 1.03 }}>
                  <Plus size={18} /> Erste Vorlage erstellen
                </motion.button>
              )}
            </div>
          </StaggerItem>
        ) : (
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((tpl) => {
                const color = tpl.themeColor || "#6366F1";
                return (
                  <TiltCard key={tpl.id} className="bg-card rounded-3xl border border-border p-7 shadow-sm" maxTilt={4} style={{ borderColor: `${color}40` }}>
                    <div className="mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
                        <LayoutTemplate size={24} style={{ color }} />
                      </div>
                      <h3 className="text-xl font-black text-foreground tracking-tight mb-2">{tpl.title}</h3>
                      <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-xl w-fit">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-sm font-bold text-muted-foreground">{tpl.blocks?.length || 0} Module</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-border">
                      <motion.button onClick={() => navigate(`/therapist/template/${tpl.id}`)} className="flex-1 bg-secondary border border-border py-3.5 rounded-2xl text-foreground font-black text-center" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        Bearbeiten
                      </motion.button>
                      <motion.button onClick={() => { setAssignTemplate(tpl); setSelectedClientId(null); }} className="flex-1 py-3.5 rounded-2xl text-white font-black flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: color, boxShadow: `0 6px 16px ${color}40` }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        <Send size={16} /> Zuweisen
                      </motion.button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <PressableScale onClick={() => setDeleteTarget(tpl)}>
                        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                          <Trash2 size={16} className="text-destructive" />
                        </div>
                      </PressableScale>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </StaggerItem>
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignTemplate && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">Klient auswählen</h2>
                <button onClick={() => setAssignTemplate(null)} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Keine Klienten vorhanden.</p>
                ) : (
                  clients.map((c: any) => (
                    <PressableScale key={c.id} onClick={() => setSelectedClientId(c.id)}>
                      <div className={`bg-secondary rounded-2xl border p-4 flex items-center gap-3 ${selectedClientId === c.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                          {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                        </div>
                        <span className="font-bold text-foreground">{c.firstName} {c.lastName}</span>
                      </div>
                    </PressableScale>
                  ))
                )}
              </div>
              {selectedClientId && (
                <div className="p-6 pt-0">
                  <motion.button onClick={handleAssign} disabled={assigning} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {assigning ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Send size={18} /> Zuweisen</>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-sm p-6 shadow-2xl text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="text-lg font-black text-foreground mb-2">Vorlage löschen?</h3>
              <p className="text-sm text-muted-foreground mb-6">„{deleteTarget.title}" wird gelöscht.</p>
              <div className="flex gap-3">
                <motion.button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-bold" whileTap={{ scale: 0.97 }}>Abbrechen</motion.button>
                <motion.button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold" whileTap={{ scale: 0.97 }}>Löschen</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
