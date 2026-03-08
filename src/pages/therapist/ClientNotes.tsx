import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, Plus, Trash2, X, Search, Lock, BookOpen,
  ChevronDown, Save, Calendar, Share2, Paperclip, Link2,
  Video, Eye, EyeOff, FileText, Image as ImageIcon, ExternalLink,
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

const headerImg = getRandomHeaderImage();

interface SessionNote {
  id: string;
  clientId: string;
  title: string;
  content: string;
  sessionDate: string;
  type: "session" | "journal";
  authorRole: "therapist" | "client";
  isShared: boolean;
  attachments?: Attachment[];
  createdAt: string;
}

interface Attachment {
  type: "file" | "link" | "video";
  name: string;
  url: string;
}

export default function ClientNotes() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "session" | "journal">("all");

  // New/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [isShared, setIsShared] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SessionNote | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  // Fetch notes from client_notes collection
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const q = query(collection(db, "client_notes"), where("clientId", "==", id));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionNote));
        data.sort((a, b) => {
          const da = new Date(b.sessionDate || b.createdAt || 0).getTime();
          const db_ = new Date(a.sessionDate || a.createdAt || 0).getTime();
          return da - db_;
        });
        setNotes(data);
      } catch (e) {
        console.error("Error fetching notes:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isSession = (n: SessionNote) => n.type === "session" || n.authorRole === "therapist";
  const isJournal = (n: SessionNote) => n.type === "journal" || n.authorRole === "client";

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

  const resetModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteContent("");
    setSessionDate(new Date().toISOString().split("T")[0]);
    setIsShared(false);
    setAttachments([]);
    setLinkUrl("");
    setVideoUrl("");
    setShowLinkInput(false);
    setShowVideoInput(false);
  };

  const openNewNote = () => {
    resetModal();
    setShowModal(true);
  };

  const openEditNote = (note: SessionNote) => {
    setEditingNote(note);
    setNoteTitle(note.title || "");
    setNoteContent(note.content || "");
    setSessionDate(note.sessionDate || new Date().toISOString().split("T")[0]);
    setIsShared(note.isShared || false);
    setAttachments(note.attachments || []);
    setShowModal(true);
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const path = `session_notes/${id}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setAttachments(prev => [...prev, { type: "file", name: file.name, url }]);
      setToast({ visible: true, message: "Datei hochgeladen", type: "success" });
    } catch (err) {
      console.error("Upload error:", err);
      setToast({ visible: true, message: "Upload fehlgeschlagen", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setAttachments(prev => [...prev, { type: "link", name: url, url }]);
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const addVideo = () => {
    if (!videoUrl.trim()) return;
    let url = videoUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setAttachments(prev => [...prev, { type: "video", name: url, url }]);
    setVideoUrl("");
    setShowVideoInput(false);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Save note
  const handleSaveNote = async () => {
    if (!id || !noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    try {
      const noteData = {
        clientId: id,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        sessionDate,
        type: "session" as const,
        authorRole: "therapist" as const,
        isShared,
        attachments,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
      };

      if (editingNote) {
        const { clientId, createdAt, ...updateData } = noteData;
        await updateDoc(doc(db, "client_notes", editingNote.id), updateData);
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...noteData } : n));
      } else {
        const docRef = await addDoc(collection(db, "client_notes"), noteData);
        setNotes(prev => [{ id: docRef.id, ...noteData }, ...prev]);
      }

      resetModal();
      setToast({ visible: true, message: editingNote ? "Notiz aktualisiert!" : "Session Note gespeichert!", type: "success" });
    } catch (e) {
      console.error("Error saving note:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Notiz konnte nicht gespeichert werden.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle share
  const toggleShare = async (note: SessionNote) => {
    try {
      const newShared = !note.isShared;
      await updateDoc(doc(db, "client_notes", note.id), { isShared: newShared });
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isShared: newShared } : n));
      setToast({ visible: true, message: newShared ? "Für Klient freigegeben" : "Freigabe aufgehoben", type: "success" });
    } catch (e) {
      console.error("Error toggling share:", e);
      setToast({ visible: true, message: "Fehler beim Ändern der Freigabe", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "client_notes", deleteTarget.id));
      setNotes(prev => prev.filter(n => n.id !== deleteTarget.id));
      setToast({ visible: true, message: "Notiz gelöscht", type: "success" });
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting note:", e);
      setToast({ visible: true, message: "Fehler beim Löschen", type: "error" });
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    } catch { return dateStr; }
  };

  const attachmentIcon = (type: string) => {
    if (type === "video") return <Video size={14} className="text-accent" />;
    if (type === "link") return <ExternalLink size={14} className="text-primary" />;
    return <FileText size={14} className="text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary-dark to-primary rounded-b-[2rem] relative overflow-hidden">
          <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
          <HeaderOrbs />
          <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
            <div className="h-6 w-32 bg-white/20 rounded-xl mb-3 animate-pulse" />
            <div className="h-8 w-48 bg-white/15 rounded-2xl animate-pulse" />
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
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={openNewNote} className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl text-primary text-sm font-bold" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Plus size={16} /> Session Note
            </motion.button>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Session Notes & Tagebuch</h1>

          <div className="flex gap-3 mt-3 mb-4">
            <Badge variant="muted" className="bg-white/15 border-white/25 text-white"><Lock size={10} className="mr-1 inline" /> {sessionCount} Session</Badge>
            <Badge variant="muted" className="bg-white/15 border-white/25 text-white"><BookOpen size={10} className="mr-1 inline" /> {journalCount} Tagebuch</Badge>
          </div>

          <div className="flex gap-2 mb-4">
            {(["all", "session", "journal"] as const).map((f) => (
              <motion.button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-colors ${filter === f ? "bg-white text-primary" : "bg-white/15 text-white"}`} whileTap={{ scale: 0.95 }}>
                {f === "all" ? "Alle" : f === "session" ? "Session Notes" : "Tagebuch"}
              </motion.button>
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

      {/* Notes List */}
      <StaggerContainer className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <FileText size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">Keine Notizen</h2>
              <p className="text-muted-foreground">Erstelle eine Session Note oder warte auf Tagebucheinträge.</p>
            </div>
          </StaggerItem>
        ) : (
          filtered.map((note, idx) => {
            const session = isSession(note);
            const expanded = expandedId === note.id;

            return (
              <StaggerItem key={note.id}>
                <motion.div
                  className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <button onClick={() => setExpandedId(expanded ? null : note.id)} className="w-full text-left p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <h3 className="font-black text-foreground text-lg leading-tight">{note.title || (session ? "Session Note" : "Tagebucheintrag")}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                            <Calendar size={11} />
                            {formatDate(note.sessionDate || note.createdAt)}
                          </span>
                          <Badge variant={session ? "default" : "success"}>
                            {session ? "Session" : "Tagebuch"}
                          </Badge>
                          {note.isShared && (
                            <Badge variant="muted" className="text-[10px]">
                              <Eye size={10} className="mr-0.5 inline" /> Sichtbar
                            </Badge>
                          )}
                          {note.attachments && note.attachments.length > 0 && (
                            <Badge variant="muted" className="text-[10px]">
                              <Paperclip size={10} className="mr-0.5 inline" /> {note.attachments.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={18} className="text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                          {/* Content */}
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.content || "Kein Inhalt."}</p>

                          {/* Attachments */}
                          {note.attachments && note.attachments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Anhänge</p>
                              <div className="flex flex-wrap gap-2">
                                {note.attachments.map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                                  >
                                    {attachmentIcon(att.type)}
                                    <span className="truncate max-w-[180px]">{att.name}</span>
                                    <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {session && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <PressableScale onClick={() => openEditNote(note)}>
                                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                                  <Save size={14} /> Bearbeiten
                                </div>
                              </PressableScale>
                              <PressableScale onClick={() => toggleShare(note)}>
                                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm ${note.isShared ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                                  {note.isShared ? <Eye size={14} /> : <EyeOff size={14} />}
                                  {note.isShared ? "Freigegeben" : "Freigeben"}
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
                </motion.div>
              </StaggerItem>
            );
          })
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* New / Edit Note Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && resetModal()}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">{editingNote ? "Notiz bearbeiten" : "Neue Session Note"}</h2>
                <button onClick={resetModal} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>

              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Titel *</label>
                  <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="z.B. Sitzung 12 – Kognitive Umstrukturierung" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {/* Session Date */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Sitzungsdatum</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full bg-secondary rounded-2xl border border-border p-3.5 pl-10 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Inhalt *</label>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Wichtigste Inhalte, Beobachtungen, Interventionen, Hausaufgaben..." rows={8} className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed" />
                </div>

                {/* Attachments */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Anhänge</label>

                  {/* Existing attachments */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 text-sm font-medium text-foreground">
                          {attachmentIcon(att.type)}
                          <span className="truncate max-w-[140px]">{att.name}</span>
                          <button onClick={() => removeAttachment(i)} className="text-destructive hover:text-destructive/80"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:bg-secondary/80 disabled:opacity-50"
                      whileTap={{ scale: 0.95 }}
                    >
                      {uploading ? (
                        <motion.span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                      ) : (
                        <Paperclip size={14} />
                      )}
                      Datei
                    </motion.button>
                    <motion.button onClick={() => setShowLinkInput(!showLinkInput)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:bg-secondary/80" whileTap={{ scale: 0.95 }}>
                      <Link2 size={14} /> Link
                    </motion.button>
                    <motion.button onClick={() => setShowVideoInput(!showVideoInput)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-bold text-foreground hover:bg-secondary/80" whileTap={{ scale: 0.95 }}>
                      <Video size={14} /> Video
                    </motion.button>
                  </div>

                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx" />

                  {/* Link input */}
                  <AnimatePresence>
                    {showLinkInput && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                        <div className="flex gap-2">
                          <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="flex-1 bg-secondary rounded-xl border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={e => e.key === "Enter" && addLink()} />
                          <motion.button onClick={addLink} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold" whileTap={{ scale: 0.95 }}>+</motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Video input */}
                  <AnimatePresence>
                    {showVideoInput && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                        <div className="flex gap-2">
                          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube- oder Vimeo-Link..." className="flex-1 bg-secondary rounded-xl border border-border p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" onKeyDown={e => e.key === "Enter" && addVideo()} />
                          <motion.button onClick={addVideo} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold" whileTap={{ scale: 0.95 }}>+</motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Share toggle */}
                <div className="flex items-center justify-between bg-secondary rounded-2xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Share2 size={18} className="text-primary" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Für Klient freigeben</p>
                      <p className="text-xs text-muted-foreground">Klient kann diese Notiz einsehen</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setIsShared(!isShared)}
                    className={`w-12 h-7 rounded-full relative transition-colors ${isShared ? "bg-primary" : "bg-border"}`}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm" animate={{ left: isShared ? 26 : 4 }} transition={{ type: "spring", damping: 20, stiffness: 300 }} />
                  </motion.button>
                </div>
              </div>

              {/* Save */}
              <div className="p-6 pt-0">
                <motion.button
                  onClick={handleSaveNote}
                  disabled={saving || !noteTitle.trim() || !noteContent.trim()}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? (
                    <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                  ) : (
                    <><Save size={18} /> {editingNote ? "Aktualisieren" : "Speichern"}</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Notiz löschen?"
        message="Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Löschen"
        isDestructive
      />

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
  );
}
