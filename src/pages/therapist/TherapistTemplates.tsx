import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, Send, Search, X, LayoutTemplate, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, PressableScale } from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Badge } from "../../components/ui/Badge";

export default function TherapistTemplates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignTemplate, setAssignTemplate] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
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
      await deleteDoc(doc(db, "exercise_templates", deleteTarget.id));
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ visible: true, message: "Vorlage gelöscht", subMessage: `„${deleteTarget.title}" wurde entfernt.`, type: "success" });
    } catch {
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
    } catch {
      setToast({ visible: true, message: "Fehler", subMessage: "Zuweisung fehlgeschlagen.", type: "error" });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card px-6 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="h-8 w-48 bg-muted rounded-lg mb-2 animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-xl border border-border h-48 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate("/therapist")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold transition-colors" whileHover={{ x: -3 }}>
              <ArrowLeft size={16} /> Dashboard
            </motion.button>
            <motion.button onClick={() => navigate("/therapist/template/new")} className="flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-xl text-sm font-bold" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Plus size={16} /> Neue Vorlage
            </motion.button>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Übungsvorlagen</h1>
            <Badge variant="muted">{templates.length}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Erstelle und verwalte interaktive Vorlagen für deine Klienten.</p>

          <div className="mt-5 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Vorlagen durchsuchen..." className="w-full pl-11 pr-10 py-3 bg-secondary border border-border rounded-xl text-foreground font-medium placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <LayoutTemplate size={40} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-black text-foreground mb-1">{search ? "Keine Treffer" : "Noch keine Vorlagen"}</h2>
            <p className="text-muted-foreground text-sm mb-6">Erstelle deine erste Übungsvorlage um loszulegen.</p>
            {!search && (
              <motion.button onClick={() => navigate("/therapist/template/new")} className="bg-foreground text-background px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 text-sm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Plus size={16} /> Erste Vorlage erstellen
              </motion.button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((tpl) => {
              const color = tpl.themeColor || "hsl(var(--primary))";
              return (
                <motion.div
                  key={tpl.id}
                  className="bg-card rounded-xl border border-border p-5 relative group hover:border-foreground/15 transition-colors"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button onClick={() => setDeleteTarget(tpl)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-destructive/8 border border-destructive/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/15">
                    <Trash2 size={14} className="text-destructive" />
                  </button>

                  <div className="mb-4 pr-10">
                    {tpl.coverImage ? (
                      <div className="-mx-5 -mt-5 mb-4 h-40 overflow-hidden border-b border-border bg-secondary relative">
                        <img src={tpl.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-35" aria-hidden="true" loading="lazy" />
                        <img src={tpl.coverImage} alt={`Titelbild von ${tpl.title}`} className="relative z-10 w-full h-full object-contain" loading="lazy" />
                      </div>
                    ) : (
                      <div className="-mx-5 -mt-5 mb-4 h-40 border-b border-border bg-secondary flex items-center justify-center">
                        <LayoutTemplate size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                      <LayoutTemplate size={18} style={{ color }} />
                    </div>
                    <h3 className="text-base font-black text-foreground tracking-tight mb-1">{tpl.title}</h3>
                    <span className="text-xs text-muted-foreground font-medium">
                      <FileText size={11} className="inline mr-1" />{tpl.blocks?.length || 0} Module
                    </span>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <button onClick={() => navigate(`/therapist/template/${tpl.id}`)} className="flex-1 bg-secondary border border-border py-2.5 rounded-lg text-foreground font-bold text-center text-sm hover:bg-muted transition-colors">
                      Bearbeiten
                    </button>
                    <button onClick={() => { setAssignTemplate(tpl); setSelectedClientId(null); }} className="flex-1 py-2.5 rounded-lg text-primary-foreground font-bold flex items-center justify-center gap-1.5 text-sm bg-primary hover:opacity-90 transition-opacity">
                      <Send size={13} /> Zuweisen
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignTemplate && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssignTemplate(null)}>
            <motion.div className="bg-card rounded-xl border border-border w-full max-w-md shadow-2xl" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 22 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h2 className="text-base font-black text-foreground">Klient auswählen</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">„{assignTemplate.title}" zuweisen</p>
                </div>
                <button onClick={() => setAssignTemplate(null)} className="p-1.5 rounded-lg hover:bg-secondary"><X size={18} className="text-muted-foreground" /></button>
              </div>
              <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Keine Klienten vorhanden.</p>
                ) : clients.map((c: any) => (
                  <PressableScale key={c.id} onClick={() => setSelectedClientId(c.id)}>
                    <div className={`bg-secondary rounded-lg border p-3 flex items-center gap-3 transition-all ${selectedClientId === c.id ? "border-primary ring-1 ring-primary/20" : "border-border"}`}>
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                        {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                      </div>
                      <span className="font-bold text-foreground text-sm flex-1">{c.firstName} {c.lastName}</span>
                      {selectedClientId === c.id && <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center"><span className="text-primary-foreground text-[10px]">✓</span></div>}
                    </div>
                  </PressableScale>
                ))}
              </div>
              {selectedClientId && (
                <div className="p-5 pt-0">
                  <motion.button onClick={handleAssign} disabled={assigning} className="w-full py-3 rounded-lg bg-foreground text-background font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2" whileTap={{ scale: 0.97 }}>
                    {assigning ? <motion.span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Send size={14} /> Zuweisen</>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal visible={!!deleteTarget} title="Vorlage löschen?" message={`„${deleteTarget?.title || ""}" wird unwiderruflich gelöscht.`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} confirmText="Löschen" cancelText="Abbrechen" isDestructive />
      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
