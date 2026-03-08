import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft, Plus, Edit3, Trash2, X, Calendar, Search,
  Lock, Unlock, ChevronDown, ChevronUp, Save,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  isShared?: boolean;
  authorRole?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
}

export default function Notes() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editShared, setEditShared] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users", profile.id, "notes"))
        );
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
    return notes.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
    );
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
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditShared(note.isShared || false);
    } else {
      setEditNote(null);
      setEditTitle("");
      setEditContent("");
      setEditShared(false);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!profile?.id || !editTitle.trim()) return;
    setSaving(true);
    try {
      if (editNote) {
        await updateDoc(doc(db, "users", profile.id, "notes", editNote.id), {
          title: editTitle.trim(),
          content: editContent.trim(),
          isShared: editShared,
          updatedAt: new Date().toISOString(),
        });
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editNote.id
              ? { ...n, title: editTitle.trim(), content: editContent.trim(), isShared: editShared, updatedAt: new Date().toISOString() }
              : n
          )
        );
      } else {
        const docRef = await addDoc(collection(db, "users", profile.id, "notes"), {
          title: editTitle.trim(),
          content: editContent.trim(),
          isShared: editShared,
          authorRole: "client",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setNotes((prev) => [
          {
            id: docRef.id,
            title: editTitle.trim(),
            content: editContent.trim(),
            isShared: editShared,
            authorRole: "client",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setEditing(false);
    } catch (e) {
      console.error("Error saving note:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.id || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, "users", profile.id, "notes", deleteTarget.id));
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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem]">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-8">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold"
            >
              <ArrowLeft size={16} /> Zurück
            </button>
            <button
              onClick={() => openEditor()}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl transition-colors text-sm font-bold"
            >
              <Plus size={16} /> Neue Notiz
            </button>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Meine Notizen</h1>
          <p className="text-white/60 text-sm font-semibold mt-1">
            {notes.length} {notes.length === 1 ? "Eintrag" : "Einträge"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Search */}
        <div className="relative animate-slide-up">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Notizen durchsuchen..."
            className="w-full pl-11 pr-4 py-3.5 bg-card rounded-2xl border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Edit3 size={48} className="text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-black text-foreground mb-2">
              {searchTerm ? "Keine Treffer" : "Noch keine Notizen"}
            </h2>
            <p className="text-muted-foreground">
              {searchTerm ? "Versuche einen anderen Suchbegriff." : "Erstelle deine erste Notiz mit dem + Button."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateTitle, items]) => (
              <div key={dateTitle} className="animate-slide-up">
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
                    return (
                      <div
                        key={note.id}
                        className="bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : note.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-3">
                              <h3 className="font-black text-foreground text-lg leading-tight">
                                {note.title || (isMine ? "Tagebucheintrag" : "Therapeuten-Notiz")}
                              </h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs font-bold text-muted-foreground">{formatTime(note)}</span>
                                {!isMine && (
                                  <span className="text-[10px] font-extrabold bg-accent/15 text-accent px-2 py-0.5 rounded-md">
                                    Vom Therapeut
                                  </span>
                                )}
                                {isMine && note.isShared && (
                                  <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                    Freigegeben
                                  </span>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={18} className="text-muted-foreground shrink-0 mt-1" />
                            ) : (
                              <ChevronDown size={18} className="text-muted-foreground shrink-0 mt-1" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                              {note.content || "Kein Inhalt."}
                            </p>
                            {isMine && (
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => openEditor(note)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
                                >
                                  <Edit3 size={14} /> Bearbeiten
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(note)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 transition-colors"
                                >
                                  <Trash2 size={14} /> Löschen
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-3xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-black text-foreground">
                {editNote ? "Notiz bearbeiten" : "Neue Notiz"}
              </h2>
              <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Titel</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titel der Notiz..."
                  className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Inhalt</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Deine Gedanken..."
                  rows={8}
                  className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center justify-between bg-secondary rounded-2xl border border-border p-4">
                <div>
                  <p className="font-bold text-foreground text-sm">Mit Therapeut teilen</p>
                  <p className="text-xs text-muted-foreground">
                    {editShared ? "Dein Therapeut kann diese Notiz lesen." : "Nur für dich sichtbar."}
                  </p>
                </div>
                <button
                  onClick={() => setEditShared(!editShared)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    editShared ? "bg-primary/15 border-2 border-primary" : "bg-muted border border-border"
                  }`}
                >
                  {editShared ? <Unlock size={18} className="text-primary" /> : <Lock size={18} className="text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="p-6 pt-0">
              <button
                onClick={handleSave}
                disabled={saving || !editTitle.trim()}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Save size={18} /> Speichern</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card rounded-3xl border border-border w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-black text-foreground mb-2">Notiz löschen?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              „{deleteTarget.title}" wird unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-bold hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold hover:opacity-90 transition-opacity"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
