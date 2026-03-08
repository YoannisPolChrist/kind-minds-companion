import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft, Plus, Edit3, Trash2, X, Calendar, Search,
  Lock, Unlock, ChevronDown, Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale, TiltCard } from "../components/motion";
import { EMOTION_PRESETS, getEmotionByScore, getEmotionLabel } from "../../constants/emotions";
import { getRandomHeaderImage } from "../constants/headerImages";

interface Note {
  id: string;
  clientId: string;
  title?: string;
  content: string;
  isShared?: boolean;
  authorRole?: string;
  type?: string;
  emotionScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

const headerImg = getRandomHeaderImage();

export default function Notes() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editShared, setEditShared] = useState(false);
  const [editEmotionScore, setEditEmotionScore] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const locale = typeof navigator !== "undefined" ? navigator.language : "de";

  const emotionChoices = useMemo(() => {
    const byScore = new Map<number, (typeof EMOTION_PRESETS)[number]>();
    EMOTION_PRESETS.forEach((preset) => {
      if (!byScore.has(preset.score)) byScore.set(preset.score, preset);
    });
    return Array.from(byScore.values()).sort((a, b) => b.score - a.score);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "client_notes"), where("clientId", "==", profile.id)));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
        data.sort((a, b) => {
          const da = a.updatedAt || a.createdAt || "";
          const db_ = b.updatedAt || b.createdAt || "";
          return db_.localeCompare(da);
        });
        setNotes(data);
      } catch (e) {
        console.error("Error fetching notes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return notes;
    const q = searchTerm.toLowerCase();
    return notes.filter((n) => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
  }, [notes, searchTerm]);

  const grouped = useMemo(() => {
    const groups: Record<string, Note[]> = {};
    filtered.forEach((n) => {
      const dateStr = n.updatedAt || n.createdAt || new Date().toISOString();
      const date = new Date(dateStr);
      const key = date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups);
  }, [filtered]);

  const openEditor = (note?: Note) => {
    if (note) {
      setEditNote(note);
      setEditTitle(note.title || "");
      setEditContent(note.content || "");
      setEditShared(note.isShared || false);
      setEditEmotionScore(note.emotionScore || 5);
    } else {
      setEditNote(null);
      setEditTitle("");
      setEditContent("");
      setEditShared(false);
      setEditEmotionScore(5);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!profile?.id || !editContent.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (editNote) {
        await updateDoc(doc(db, "client_notes", editNote.id), {
          title: editTitle.trim() || null,
          content: editContent.trim(),
          isShared: editShared,
          emotionScore: editEmotionScore,
          updatedAt: now,
        });
        setNotes((prev) => prev.map((n) => n.id === editNote.id ? {
          ...n,
          title: editTitle.trim() || undefined,
          content: editContent.trim(),
          isShared: editShared,
          emotionScore: editEmotionScore,
          updatedAt: now,
        } : n));
      } else {
        const payload = {
          clientId: profile.id,
          title: editTitle.trim() || null,
          content: editContent.trim(),
          isShared: editShared,
          emotionScore: editEmotionScore,
          authorRole: "client",
          type: "journal",
          createdAt: now,
          updatedAt: now,
        };
        const docRef = await addDoc(collection(db, "client_notes"), payload);
        setNotes((prev) => [{ id: docRef.id, ...payload, title: payload.title || undefined }, ...prev]);
      }
      setEditing(false);
    } catch (e) {
      console.error("Error saving note:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "client_notes", deleteTarget.id));
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  const formatTime = (note: Note) => {
    const d = new Date(note.updatedAt || note.createdAt || "");
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
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
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate("/")} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={() => openEditor()} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> Neue Notiz
            </motion.button>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Therapie-Tagebuch</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">{notes.length} {notes.length === 1 ? "Eintrag" : "Einträge"}</p>
        </div>
      </div>

      <StaggerContainer className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        <StaggerItem>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tagebuch durchsuchen..." className="w-full pl-11 pr-4 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </StaggerItem>

        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <Edit3 size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">{searchTerm ? "Keine Treffer" : "Noch keine Einträge"}</h2>
              <p className="text-muted-foreground">{searchTerm ? "Versuche einen anderen Suchbegriff." : "Erstelle deinen ersten Eintrag mit dem + Button."}</p>
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
              <div className="space-y-3">
                {items.map((note) => {
                  const isMine = !note.authorRole || note.authorRole === "client";
                  const isExpanded = expandedId === note.id;
                  const emotion = getEmotionByScore(note.emotionScore || 5);
                  return (
                    <TiltCard key={note.id} className="bg-card rounded-3xl border border-border p-5 shadow-sm" maxTilt={3}>
                      <button onClick={() => setExpandedId(isExpanded ? null : note.id)} className="w-full text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-3">
                            <h3 className="font-black text-foreground text-lg leading-tight">{note.title || (isMine ? "Tagebucheintrag" : "Therapeuten-Notiz")}</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs font-bold text-muted-foreground">{formatTime(note)}</span>
                              <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span>{emotion.emoji}</span>
                                <span>{getEmotionLabel(emotion, locale)}</span>
                              </span>
                              {!isMine && <span className="text-[10px] font-extrabold bg-accent/15 text-accent px-2 py-0.5 rounded-md">Vom Therapeut</span>}
                            </div>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={18} className="text-muted-foreground shrink-0 mt-1" />
                          </motion.div>
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="mt-4 pt-4 border-t border-border">
                              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.content || "Kein Inhalt."}</p>
                              {isMine && (
                                <div className="flex gap-2 mt-4">
                                  <PressableScale onClick={() => openEditor(note)}>
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                      <Edit3 size={14} /> Bearbeiten
                                    </div>
                                  </PressableScale>
                                  <PressableScale onClick={() => setDeleteTarget(note)}>
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-bold text-sm">
                                      <Trash2 size={14} /> Löschen
                                    </div>
                                  </PressableScale>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </TiltCard>
                  );
                })}
              </div>
            </StaggerItem>
          ))
        )}
        <div className="h-8" />
      </StaggerContainer>

      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">{editNote ? "Eintrag bearbeiten" : "Neuer Tagebucheintrag"}</h2>
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Titel (optional)</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titel der Notiz..." className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Inhalt</label>
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Deine Gedanken..." rows={8} className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Emotion</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {emotionChoices.map((emotion) => {
                      const active = editEmotionScore === emotion.score;
                      return (
                        <button
                          key={emotion.id}
                          type="button"
                          onClick={() => setEditEmotionScore(emotion.score)}
                          className={`px-3 py-2 rounded-xl border text-sm font-bold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-foreground"}`}
                        >
                          {emotion.emoji} {getEmotionLabel(emotion, locale)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-secondary rounded-2xl border border-border p-4">
                  <div>
                    <p className="font-bold text-foreground text-sm">Mit Therapeut teilen</p>
                    <p className="text-xs text-muted-foreground">{editShared ? "Dein Therapeut kann diese Notiz lesen." : "Nur für dich sichtbar."}</p>
                  </div>
                  <motion.button onClick={() => setEditShared(!editShared)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${editShared ? "bg-primary/15 border-2 border-primary" : "bg-muted border border-border"}`} whileTap={{ scale: 0.9 }}>
                    {editShared ? <Unlock size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                  </motion.button>
                </div>
              </div>
              <div className="p-6 pt-0">
                <motion.button onClick={handleSave} disabled={saving || !editContent.trim()} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {saving ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><Save size={18} /> Speichern</>}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-sm p-6 shadow-2xl text-center" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <motion.p className="text-4xl mb-3" initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.1 }}>🗑️</motion.p>
              <h3 className="text-lg font-black text-foreground mb-2">Eintrag löschen?</h3>
              <p className="text-sm text-muted-foreground mb-6">„{deleteTarget.title || "Tagebucheintrag"}" wird unwiderruflich gelöscht.</p>
              <div className="flex gap-3">
                <motion.button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-bold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Abbrechen</motion.button>
                <motion.button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Löschen</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
