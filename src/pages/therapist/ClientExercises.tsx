import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, CheckCircle, BookOpen, Activity,
  Clock, Send, LayoutTemplate, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard, PressableScale,
} from "../../components/motion";

export default function ClientExercises() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment modal
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (!id || !profile?.id) return;
    (async () => {
      try {
        const [clientSnap, exSnap, tplSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("__name__", "==", id))),
          getDocs(query(collection(db, "exercises"), where("clientId", "==", id))),
          getDocs(query(collection(db, "exercise_templates"), where("therapistId", "==", profile.id))),
        ]);
        if (!clientSnap.empty) setClient({ id: clientSnap.docs[0].id, ...clientSnap.docs[0].data() });
        setExercises(exSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTemplates(tplSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isArchived));
      } catch (e) {
        console.error("Error loading exercises:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, profile?.id]);

  const handleAssign = async () => {
    if (!selectedTemplate || !id) return;
    setAssigning(true);
    try {
      await addDoc(collection(db, "exercises"), {
        clientId: id,
        therapistId: profile?.id,
        title: selectedTemplate.title,
        blocks: selectedTemplate.blocks || [],
        themeColor: selectedTemplate.themeColor || null,
        recurrence: "none",
        completed: false,
        createdAt: serverTimestamp(),
      });
      // Refresh
      const exSnap = await getDocs(query(collection(db, "exercises"), where("clientId", "==", id)));
      setExercises(exSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setShowAssign(false);
      setSelectedTemplate(null);
    } catch (e) {
      console.error("Error assigning exercise:", e);
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "exercises", deleteTarget.id));
      setExercises((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting exercise:", e);
    }
  };

  const open = exercises.filter((e) => !e.completed);
  const completed = exercises.filter((e) => e.completed);

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
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate(`/therapist/client/${id}`)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={() => setShowAssign(true)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> Übung zuweisen
            </motion.button>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {client?.firstName} {client?.lastName} — Übungen
          </h1>
          <div className="flex gap-3 mt-3">
            <div className="bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold">{open.length} offen</div>
            <div className="bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold">{completed.length} erledigt</div>
          </div>
        </div>
      </div>

      <StaggerContainer className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {exercises.length === 0 ? (
          <StaggerItem>
            <div className="bg-card rounded-3xl border-2 border-dashed border-border p-12 text-center">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <p className="font-black text-foreground text-lg mb-2">Noch keine Übungen zugewiesen</p>
              <p className="text-muted-foreground text-sm">Klicke auf "Übung zuweisen" um loszulegen.</p>
            </div>
          </StaggerItem>
        ) : (
          <>
            {open.length > 0 && (
              <StaggerItem>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Offene Übungen</h3>
                <div className="space-y-3">
                  {open.map((ex) => (
                    <div key={ex.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{ex.title}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[11px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg">Offen</span>
                          {ex.recurrence && ex.recurrence !== "none" && (
                            <span className="text-[11px] font-bold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-lg">
                              {ex.recurrence === "daily" ? "Täglich" : "Wöchentlich"}
                            </span>
                          )}
                        </div>
                      </div>
                      <PressableScale onClick={() => setDeleteTarget(ex)}>
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Trash2 size={16} className="text-destructive" />
                        </div>
                      </PressableScale>
                    </div>
                  ))}
                </div>
              </StaggerItem>
            )}

            {completed.length > 0 && (
              <StaggerItem>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Abgeschlossen</h3>
                <div className="space-y-3">
                  {completed.map((ex) => (
                    <div
                      key={ex.id}
                      className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate(`/exercise/${ex.id}`)}
                    >
                      <CheckCircle size={18} className="text-success shrink-0" />
                      <span className="font-semibold text-foreground truncate flex-1">{ex.title}</span>
                      <span className="text-xs text-muted-foreground">Antworten einsehen →</span>
                    </div>
                  ))}
                </div>
              </StaggerItem>
            )}
          </>
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssign && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">Vorlage auswählen</h2>
                <button onClick={() => setShowAssign(false)} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-3">
                {templates.length === 0 ? (
                  <div className="text-center py-8">
                    <LayoutTemplate size={40} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Noch keine Vorlagen erstellt.</p>
                    <motion.button onClick={() => navigate("/therapist/templates")} className="mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm" whileHover={{ scale: 1.03 }}>
                      Vorlagen erstellen →
                    </motion.button>
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <PressableScale key={tpl.id} onClick={() => setSelectedTemplate(tpl)}>
                      <div className={`bg-secondary rounded-2xl border p-4 flex items-center gap-3 transition-all ${selectedTemplate?.id === tpl.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: (tpl.themeColor || "#6366F1") + "15" }}>
                          <LayoutTemplate size={18} style={{ color: tpl.themeColor || "#6366F1" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{tpl.title}</p>
                          <p className="text-xs text-muted-foreground">{tpl.blocks?.length || 0} Module</p>
                        </div>
                        {selectedTemplate?.id === tpl.id && <CheckCircle size={20} className="text-primary shrink-0" />}
                      </div>
                    </PressableScale>
                  ))
                )}
              </div>
              {selectedTemplate && (
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

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-sm p-6 shadow-2xl text-center" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <p className="text-4xl mb-3">🗑️</p>
              <h3 className="text-lg font-black text-foreground mb-2">Übung löschen?</h3>
              <p className="text-sm text-muted-foreground mb-6">„{deleteTarget.title}" wird entfernt.</p>
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
