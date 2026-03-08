import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, Send, Search, X, LayoutTemplate, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard, PressableScale } from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { SkeletonTemplateGrid } from "../../components/ui/Skeleton";
import { Badge } from "../../components/ui/Badge";

const HEADER_IMAGES = [
  "/images/HomeUi1.webp", "/images/HomeUi2.webp", "/images/HomeUi3.webp",
  "/images/HomeUi4.webp", "/images/HomeUi5.webp", "/images/HomeUi6.webp",
];
const headerImg = HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];

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

  // Feedback
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

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
      // Delete the template document
      await deleteDoc(doc(db, "exercise_templates", deleteTarget.id));
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ visible: true, message: "Vorlage gelöscht", subMessage: `„${deleteTarget.title}" wurde dauerhaft entfernt.`, type: "success" });
    } catch (e) {
      console.error("Error deleting template:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Vorlage konnte nicht gelöscht werden.", type: "error" });
      setDeleteTarget(null);
    }
  };

  const handleAssign = async () => {
    if (!assignTemplate || !selectedClientId) return;
    setAssigning(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
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
      setToast({ visible: true, message: "Übung zugewiesen!", subMessage: `„${assignTemplate.title}" an ${client?.firstName || "Klient"} zugewiesen.`, type: "success" });
    } catch (e) {
      console.error("Error assigning:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Zuweisung fehlgeschlagen.", type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
          <HeaderOrbs />
          <div className="max-w-5xl mx-auto px-6 pt-12 pb-8 relative z-10">
            <div className="h-8 w-40 bg-white/20 rounded-2xl mb-2" />
            <div className="h-4 w-64 bg-white/10 rounded-xl" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-6">
          <SkeletonTemplateGrid />
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/60 to-primary/70" />
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">Übungsvorlagen</h1>
            <Badge variant="muted" className="bg-white/15 border-white/25 text-white">{templates.length}</Badge>
          </div>
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
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <LayoutTemplate size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">{search ? "Keine Treffer" : "Noch keine Vorlagen"}</h2>
              <p className="text-muted-foreground text-sm mb-6">Erstelle deine erste Übungsvorlage um loszulegen.</p>
              {!search && (
                <motion.button onClick={() => navigate("/therapist/template/new")} className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2 shadow-lg shadow-primary/20" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
                  <div key={tpl.id} className="bg-card rounded-3xl border-2 p-6 shadow-sm relative hover:shadow-md transition-shadow" style={{ borderColor: `${color}55` }}>
                    {/* Delete top-right */}
                    <button onClick={() => setDeleteTarget(tpl)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                      <Trash2 size={15} className="text-destructive" />
                    </button>

                    <div className="mb-4 pr-12">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
                        <LayoutTemplate size={22} style={{ color }} />
                      </div>
                      <h3 className="text-lg font-black text-foreground tracking-tight mb-1.5">{tpl.title}</h3>
                      <Badge variant="muted">
                        <FileText size={12} className="mr-1 inline" />
                        {tpl.blocks?.length || 0} Module
                      </Badge>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-border">
                      <button onClick={() => navigate(`/therapist/template/${tpl.id}`)} className="flex-1 bg-secondary border border-border py-3 rounded-2xl text-foreground font-black text-center text-sm hover:bg-muted transition-colors">
                        Bearbeiten
                      </button>
                      <button onClick={() => { setAssignTemplate(tpl); setSelectedClientId(null); }} className="flex-1 py-3 rounded-2xl text-white font-black flex items-center justify-center gap-2 shadow-lg text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: color, boxShadow: `0 6px 16px ${color}40` }}>
                        <Send size={15} /> Zuweisen
                      </button>
                    </div>
                  </div>
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
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-lg font-black text-foreground">Klient auswählen</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">„{assignTemplate.title}" zuweisen</p>
                </div>
                <button onClick={() => setAssignTemplate(null)} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Keine Klienten vorhanden.</p>
                ) : (
                  clients.map((c: any) => (
                    <PressableScale key={c.id} onClick={() => setSelectedClientId(c.id)}>
                      <div className={`bg-secondary rounded-2xl border p-4 flex items-center gap-3 transition-all ${selectedClientId === c.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                          {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                        </div>
                        <span className="font-bold text-foreground flex-1">{c.firstName} {c.lastName}</span>
                        {selectedClientId === c.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}>
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </PressableScale>
                  ))
                )}
              </div>
              {selectedClientId && (
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
        title="Vorlage löschen?"
        message={`„${deleteTarget?.title || ""}" wird unwiderruflich gelöscht. Bereits zugewiesene Übungen bleiben erhalten.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDestructive
      />

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
