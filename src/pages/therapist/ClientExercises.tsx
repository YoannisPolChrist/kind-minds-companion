import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, CheckCircle, BookOpen, Activity,
  Send, LayoutTemplate, X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale,
} from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Badge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { getRandomHeaderImage } from "../../constants/headerImages";

export default function ClientExercises() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAssign, setShowAssign] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });
  const headerImg = getRandomHeaderImage();

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
      const docRef = await addDoc(collection(db, "exercises"), {
        clientId: id,
        therapistId: profile?.id,
        title: selectedTemplate.title,
        blocks: selectedTemplate.blocks || [],
        themeColor: selectedTemplate.themeColor || null,
        recurrence: "none",
        completed: false,
        createdAt: serverTimestamp(),
      });

      // Send email notification to client
      await addDoc(collection(db, "notifications"), {
        userId: id,
        type: "exercise_assigned",
        title: "Neue Übung zugewiesen",
        body: `Dir wurde eine neue Übung zugewiesen: "${selectedTemplate.title}"`,
        exerciseTitle: selectedTemplate.title,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      const exSnap = await getDocs(query(collection(db, "exercises"), where("clientId", "==", id)));
      setExercises(exSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setShowAssign(false);
      setSelectedTemplate(null);
      setToast({ visible: true, message: "Übung zugewiesen!", subMessage: `„${selectedTemplate.title}" – Klient wird per E-Mail benachrichtigt.`, type: "success" });
    } catch (e) {
      console.error("Error assigning exercise:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Zuweisung fehlgeschlagen.", type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "exercises", deleteTarget.id));
      setExercises((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setToast({ visible: true, message: "Übung gelöscht", type: "success" });
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting exercise:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Übung konnte nicht gelöscht werden.", type: "error" });
      setDeleteTarget(null);
    }
  };

  const open = exercises.filter((e) => !e.completed);
  const completed = exercises.filter((e) => e.completed);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary rounded-b-[2rem] relative overflow-hidden">
          <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
          <HeaderOrbs />
          <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
            <div className="h-6 w-32 bg-white/20 rounded-xl mb-3" />
            <div className="h-8 w-56 bg-white/15 rounded-2xl" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
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
            <Badge variant="muted" className="bg-white/15 border-white/25 text-white">{open.length} offen</Badge>
            <Badge variant="success" className="bg-white/15 border-white/25 text-white">{completed.length} erledigt</Badge>
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
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  Offene Übungen <Badge variant="warning">{open.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {open.map((ex, i) => (
                    <motion.div
                      key={ex.id}
                      className="bg-card rounded-2xl border border-border p-5 shadow-sm flex items-center gap-4"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, type: "spring", damping: 20 }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-[#F97316]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{ex.title}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="warning">Offen</Badge>
                          {ex.recurrence && ex.recurrence !== "none" && (
                            <Badge variant="default">{ex.recurrence === "daily" ? "Täglich" : "Wöchentlich"}</Badge>
                          )}
                        </div>
                      </div>
                      <PressableScale onClick={() => setDeleteTarget(ex)}>
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Trash2 size={16} className="text-destructive" />
                        </div>
                      </PressableScale>
                    </motion.div>
                  ))}
                </div>
              </StaggerItem>
            )}

            {completed.length > 0 && (
              <StaggerItem>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  Abgeschlossen <Badge variant="success">{completed.length}</Badge>
                </h3>
                <div className="space-y-3">
                  {completed.map((ex, i) => (
                    <motion.div
                      key={ex.id}
                      className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate(`/exercise/${ex.id}`)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <CheckCircle size={18} className="text-success shrink-0" />
                      <span className="font-semibold text-foreground truncate flex-1">{ex.title}</span>
                      <span className="text-xs text-muted-foreground">Antworten einsehen →</span>
                    </motion.div>
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
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                        {selectedTemplate?.id === tpl.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                            <CheckCircle size={20} className="text-primary" />
                          </motion.div>
                        )}
                      </div>
                    </PressableScale>
                  ))
                )}
              </div>
              {selectedTemplate && (
                <div className="p-6 pt-0">
                  <motion.button onClick={handleAssign} disabled={assigning} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {assigning ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Send size={18} /> Zuweisen</>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Übung löschen?"
        message={`„${deleteTarget?.title || ""}" wird entfernt. Der Klient kann die Übung nicht mehr sehen.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Löschen"
        isDestructive
      />

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
