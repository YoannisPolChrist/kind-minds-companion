import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, FileUp, FileText, Trash2, Search, X, FolderOpen,
  Image as ImageIcon, Film, Download, Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale } from "../../components/motion";

function getFileInfo(file: any) {
  const name = (file.originalName || file.title || "").toLowerCase();
  if (name.endsWith(".pdf")) return { icon: FileText, color: "#EF4444", bg: "bg-red-50", label: "PDF" };
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].some((e) => name.endsWith(e))) return { icon: ImageIcon, color: "#8B5CF6", bg: "bg-purple-50", label: "Bild" };
  if ([".mp4", ".mov"].some((e) => name.endsWith(e))) return { icon: Film, color: "#F59E0B", bg: "bg-amber-50", label: "Video" };
  return { icon: FileText, color: "#64748B", bg: "bg-slate-50", label: "Datei" };
}

export default function ClientFiles() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "client_resources"), where("clientId", "==", id)));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setFiles(data);
      } catch (e) {
        console.error("Error fetching files:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleUpload = async () => {
    if (!title.trim() || !id) return;
    setUploading(true);
    try {
      // For web, we create a placeholder document entry
      // Real file upload would need a file input
      const docRef = await addDoc(collection(db, "client_resources"), {
        clientId: id,
        therapistId: profile?.id || "unknown",
        title: title.trim(),
        description: desc.trim(),
        type: "document",
        createdAt: serverTimestamp(),
      });
      setFiles((prev) => [{ id: docRef.id, title: title.trim(), description: desc.trim(), type: "document", createdAt: { seconds: Date.now() / 1000 } }, ...prev]);
      setShowUpload(false);
      setTitle("");
      setDesc("");
    } catch (e) {
      console.error("Error uploading:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "client_resources", deleteTarget.id));
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting file:", e);
    }
  };

  const filtered = files.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.title?.toLowerCase().includes(q) || f.originalName?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="rounded-b-[2rem] relative overflow-hidden" style={{ background: "linear-gradient(135deg, #C09D59, #A8843D)" }}>
        <HeaderOrbs />
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10 text-white">
          <div className="flex items-center justify-between mb-5">
            <motion.button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold" whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <motion.button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl text-sm font-bold" style={{ color: "#C09D59" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <FileUp size={16} /> Hochladen
            </motion.button>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Dateien</h1>
          <p className="text-white/70 text-sm font-semibold mt-1">{files.length} {files.length === 1 ? "Datei" : "Dateien"}</p>

          {files.length > 0 && (
            <div className="mt-4 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dateien durchsuchen..." className="w-full pl-11 pr-4 py-3 bg-white/15 border border-white/25 rounded-2xl text-white font-medium placeholder-white/50 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      <StaggerContainer className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {filtered.length === 0 ? (
          <StaggerItem>
            <div className="text-center py-16">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <FolderOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">{search ? "Keine Treffer" : "Noch keine Dateien"}</h2>
              <p className="text-muted-foreground text-sm mb-6">Lade PDFs, Arbeitsblätter oder Dokumente hoch.</p>
              {!search && (
                <motion.button onClick={() => setShowUpload(true)} className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FileUp size={18} /> Erste Datei hochladen
                </motion.button>
              )}
            </div>
          </StaggerItem>
        ) : (
          filtered.map((file) => {
            const info = getFileInfo(file);
            const Icon = info.icon;
            return (
              <StaggerItem key={file.id}>
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${info.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={24} style={{ color: info.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-foreground truncate">{file.title}</p>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md" style={{ backgroundColor: info.color + "15", color: info.color }}>{info.label}</span>
                    </div>
                    {file.description && <p className="text-xs text-muted-foreground line-clamp-1">{file.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date((file.createdAt?.seconds || 0) * 1000 || Date.now()).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {file.url && (
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center hover:bg-sky-100 transition-colors">
                        <Eye size={16} className="text-sky-500" />
                      </a>
                    )}
                    <PressableScale onClick={() => setDeleteTarget(file)}>
                      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                        <Trash2 size={16} className="text-destructive" />
                      </div>
                    </PressableScale>
                  </div>
                </div>
              </StaggerItem>
            );
          })
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-black text-foreground">Datei hochladen</h2>
                <button onClick={() => setShowUpload(false)} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Titel *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Arbeitsblatt CBT" className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Beschreibung (optional)</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Kurze Beschreibung..." rows={3} className="w-full bg-secondary rounded-2xl border border-border p-3.5 text-foreground font-medium resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="p-6 pt-0">
                <motion.button onClick={handleUpload} disabled={uploading || !title.trim()} className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {uploading ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><FileUp size={18} /> Hochladen</>}
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
              <h3 className="text-lg font-black text-foreground mb-2">Datei löschen?</h3>
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
