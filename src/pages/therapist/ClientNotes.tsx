import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Edit3, Trash2, X, Calendar, Search,
  Lock, BookOpen, ChevronDown, Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, TiltCard, PressableScale } from "../../components/motion";

export default function ClientNotes() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "session" | "journal">("all");

  // New note modal
  const [showModal, setShowModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", id, "notes"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => {
          const da = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt || 0).getTime() / 1000;
          const db_ = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt || 0).getTime() / 1000;
          return db_ - da;
        });
        setNotes(data);
      } catch (e) {
        console.error("Error fetching notes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isSession = (n: any) => n.type === "session" || (n.authorRole === "therapist" && n.type !== "journal");
  const isJournal = (n: any) => n.type === "journal" || n.authorRole === "client";

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filter === "session" && !isSession(n)) return false;
      if (filter === "journal" && !isJournal(n)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notes, filter, search]);

  const sessionCount = notes.filter(isSession).length;
  const journalCount = notes.filter(isJournal).length;

  const handleSaveNote = async () => {
    if (!id || !noteContent.trim()) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "users", id, "notes"), {
        title: noteTitle.trim() || "Session Note",
        content: noteContent.trim(),
        type: "session",
        authorRole: "therapist",
        isShared: false,
        createdAt: new Date().toISOString(),
      });
      setNotes((prev) => [{ id: docRef.id, title: noteTitle.trim() || "Session Note", content: noteContent.trim(), type: "session", authorRole: "therapist", isShared: false, createdAt: new Date().toISOString() }, ...prev]);
      setShowModal(false);
      setNoteTitle("");
      setNoteContent("");
    } catch (e) {
      console.error("Error saving note:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", id, "notes", deleteTarget.id));
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting note:", e);
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
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl text-primary text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> Session Note
            </motion.button>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Notizen & Tagebuch</h1>

          {/* Stats */}
          <div className="flex gap-3 mt-3 mb-4">
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold"><Lock size={12} /> {sessionCount} Session Notes</div>
            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl text-xs font-bold"><BookOpen size={12} /> {journalCount} Tagebucheinträge</div>
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-4">
            {(["all", "session", "journal"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-colors ${filter === f ? "bg-white text-primary" : "bg-white/15 text-white"}`}>
                {f === "all" ? "Alle" : f === "session" ? "Session Notes" : "Tagebuch"}
              </button>
            ))}
          </div>

          {notes.length > 0 && (
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Notizen durchsuchen..." className="w-full pl-11 pr-4 py-3 bg-white/15 border border-white/25 rounded-2xl text-white font-medium placeholder-white/50 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      <StaggerContainer className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <Edit3 size={48} className="text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-black text-foreground mb-2">Keine Notizen</h2>
              <p className="text-muted-foreground">Erstelle eine Session Note oder warte auf Tagebucheinträge.</p>
            </div>
          </StaggerItem>
        ) : (
          filtered.map((note) => {
            const session = isSession(note);
            const expanded = expandedId === note.id;
            const accentColor = session ? "hsl(var(--primary))" : "#16A34A";

            return (
              <StaggerItem key={note.id}>
                <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
                  <button onClick={() => setExpandedId(expanded ? null : note.id)} className="w-full text-left">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <h3 className="font-black text-foreground text-lg leading-tight">{note.title || (session ? "Session Note" : "Tagebucheintrag")}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-bold text-muted-foreground">
                            {new Date(note.createdAt?.seconds ? note.createdAt.seconds * 1000 : note.createdAt || Date.now()).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${session ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                            {session ? "Session Note" : "Tagebuch"}
                          </span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={18} className="text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.content || "Kein Inhalt."}</p>
                          {session && (
                            <div className="mt-4">
                              <PressableScale onClick={() => setDeleteTarget(note)}>
                                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-bold text-sm w-fit">
                                  <Trash2 size={14} /> Löschen
                                </div>
                              </PressableScale>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* New Note Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">Neue Session Note</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Titel (optional)</label>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="z.B. Sitzung 12" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Inhalt</label>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Notizen zur Sitzung..." rows={8} className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="p-6 pt-0">
                <motion.button onClick={handleSaveNote} disabled={saving || !noteContent.trim()} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {saving ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Save size={18} /> Speichern</>}
                </motion.button>
              </div>
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
              <h3 className="text-lg font-black text-foreground mb-2">Notiz löschen?</h3>
              <p className="text-sm text-muted-foreground mb-6">Diese Aktion kann nicht rückgängig gemacht werden.</p>
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
