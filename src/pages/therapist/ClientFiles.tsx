import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, FileUp, FileText, Trash2, Search, X, FolderOpen,
  Image as ImageIcon, Film, Eye, FileCode, File, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale } from "../../components/motion";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Badge } from "../../components/ui/Badge";
import { SkeletonCard } from "../../components/ui/Skeleton";

// ─── File type helpers ─────────────────────────────────────────────────────────

function getFileInfo(file: any) {
  const name = (file.originalName || file.title || "").toLowerCase();
  if (name.endsWith(".pdf")) return { icon: FileText, color: "#EF4444", bg: "bg-destructive/10", label: "PDF" };
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].some((e) => name.endsWith(e)))
    return { icon: ImageIcon, color: "#8B5CF6", bg: "bg-[#8B5CF6]/10", label: "Bild" };
  if ([".mp4", ".mov", ".avi", ".mkv"].some((e) => name.endsWith(e)))
    return { icon: Film, color: "#F59E0B", bg: "bg-[#F59E0B]/10", label: "Video" };
  if ([".doc", ".docx"].some((e) => name.endsWith(e)))
    return { icon: FileText, color: "#2563EB", bg: "bg-[#2563EB]/10", label: "Word" };
  if ([".xls", ".xlsx", ".csv"].some((e) => name.endsWith(e)))
    return { icon: FileCode, color: "#10B981", bg: "bg-[#10B981]/10", label: "Excel" };
  return { icon: File, color: "#64748B", bg: "bg-muted", label: "Datei" };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── File Card ─────────────────────────────────────────────────────────────────

function FileCard({ file, index, onDelete, onPreview }: {
  file: any; index: number; onDelete: (f: any) => void; onPreview: (f: any) => void;
}) {
  const info = getFileInfo(file);
  const Icon = info.icon;
  return (
    <motion.div
      className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-4"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className={`w-14 h-14 rounded-2xl ${info.bg} flex items-center justify-center shrink-0`}>
        <Icon size={24} style={{ color: info.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-foreground truncate">{file.title}</p>
          <Badge variant="muted">{info.label}</Badge>
        </div>
        {file.description && <p className="text-xs text-muted-foreground line-clamp-1">{file.description}</p>}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-muted-foreground">
            {new Date((file.createdAt?.seconds || 0) * 1000 || Date.now()).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          {file.fileSize && <p className="text-[11px] text-muted-foreground">· {formatFileSize(file.fileSize)}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {file.url && (
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Eye size={16} className="text-primary" />
          </a>
        )}
        <PressableScale onClick={() => onDelete(file)}>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <Trash2 size={16} className="text-destructive" />
          </div>
        </PressableScale>
      </div>
    </motion.div>
  );
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ visible, onClose, onUpload }: {
  visible: boolean;
  onClose: () => void;
  onUpload: (title: string, desc: string, file: File | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedFile) return;
    setUploading(true);
    try {
      await onUpload(title.trim(), desc.trim(), selectedFile);
      setTitle("");
      setDesc("");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setTitle("");
    setDesc("");
    setSelectedFile(null);
    setUploading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={reset}>
      <motion.div className="bg-card rounded-3xl border border-border w-full max-w-lg shadow-2xl" initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: "spring", damping: 20, stiffness: 150 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-black text-foreground">Datei hochladen</h2>
          <button onClick={reset} className="p-2 rounded-xl hover:bg-secondary"><X size={20} className="text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl py-8 flex flex-col items-center gap-3 cursor-pointer transition-all
              ${dragOver ? "border-primary bg-primary/5 scale-[1.02]" : selectedFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-secondary/50"}`}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            {selectedFile ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs font-bold text-destructive hover:underline">Entfernen</button>
              </>
            ) : (
              <>
                <motion.div animate={dragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }} className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload size={28} className="text-primary" />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">Datei hierher ziehen</p>
                  <p className="text-xs text-muted-foreground mt-1">oder klicken zum Auswählen</p>
                </div>
              </>
            )}
          </div>

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
          <motion.button onClick={handleSubmit} disabled={uploading || !title.trim() || !selectedFile} className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-black text-lg disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            {uploading ? <motion.span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> : <><FileUp size={18} /> Hochladen</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientFiles() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; subMessage?: string; type: "success" | "error" }>({ visible: false, message: "", type: "success" });

  // Page-level drag & drop
  const [pageDragOver, setPageDragOver] = useState(false);

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

  const handleUpload = async (title: string, desc: string, file: File | null) => {
    if (!file || !id) return;
    try {
      const storagePath = `client_resources/${id}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, "client_resources"), {
        clientId: id,
        therapistId: profile?.id || "unknown",
        title,
        description: desc,
        type: "document",
        url,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        createdAt: serverTimestamp(),
      });

      // Notification for client
      await addDoc(collection(db, "notifications"), {
        userId: id,
        type: "FILE_UPLOAD",
        title: "Neue Datei",
        body: "Hey, für dich wurde eine neue Datei hinterlegt!",
        message: "Hey, für dich wurde eine neue Datei hinterlegt!",
        read: false,
        createdAt: serverTimestamp(),
      });

      setFiles((prev) => [{
        id: docRef.id, title, description: desc, type: "document", url,
        originalName: file.name, storagePath, fileSize: file.size, mimeType: file.type,
        createdAt: { seconds: Date.now() / 1000 },
      }, ...prev]);
      setShowUpload(false);
      setToast({ visible: true, message: "Hochgeladen!", subMessage: "Klient wurde benachrichtigt.", type: "success" });
    } catch (e) {
      console.error("Error uploading:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Upload fehlgeschlagen.", type: "error" });
      throw e;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.storagePath) {
        try { await deleteObject(ref(storage, deleteTarget.storagePath)); } catch {}
      }
      await deleteDoc(doc(db, "client_resources", deleteTarget.id));
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setToast({ visible: true, message: "Datei gelöscht", type: "success" });
      setDeleteTarget(null);
    } catch (e) {
      console.error("Error deleting file:", e);
      setToast({ visible: true, message: "Fehler", subMessage: "Datei konnte nicht gelöscht werden.", type: "error" });
      setDeleteTarget(null);
    }
  };

  const filtered = files.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.title?.toLowerCase().includes(q) || f.originalName?.toLowerCase().includes(q);
  });

  // Page-level drop handler: open modal with file pre-selected
  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setPageDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      setShowUpload(true);
      // Small delay to let modal mount, then dispatch a synthetic approach
      // We'll use a simpler approach: store the file and pass it
      (window as any).__pendingDropFile = droppedFiles[0];
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="rounded-b-[2rem] relative overflow-hidden" style={{ background: "linear-gradient(135deg, #C09D59, #A8843D)" }}>
          <HeaderOrbs />
          <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 relative z-10">
            <div className="h-6 w-32 bg-white/20 rounded-xl mb-3" />
            <div className="h-8 w-40 bg-white/15 rounded-2xl" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background relative"
      onDragOver={(e: React.DragEvent) => { e.preventDefault(); setPageDragOver(true); }}
      onDragLeave={(e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setPageDragOver(false);
      }}
      onDrop={handlePageDrop}
    >
    <PageTransition className="min-h-screen">
      {/* Full-page drop overlay */}
      <AnimatePresence>
        {pageDragOver && (
          <motion.div
            className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl border-2 border-dashed border-primary p-12 text-center shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <Upload size={48} className="text-primary mx-auto mb-4" />
              <p className="text-xl font-black text-foreground">Datei hier ablegen</p>
              <p className="text-sm text-muted-foreground mt-2">Die Datei wird für diesen Klienten hochgeladen</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight">Dateien</h1>
            <Badge variant="muted" className="bg-white/15 border-white/25 text-white">{files.length}</Badge>
          </div>

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
              <motion.div animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <FolderOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground mb-2">{search ? "Keine Treffer" : "Noch keine Dateien"}</h2>
              <p className="text-muted-foreground text-sm mb-6">
                {search ? `Keine Dateien für „${search}" gefunden.` : "Lade PDFs, Arbeitsblätter oder Dokumente hoch – oder ziehe sie einfach in dieses Fenster."}
              </p>
              {!search && (
                <motion.button onClick={() => setShowUpload(true)} className="bg-accent text-accent-foreground px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <FileUp size={18} /> Erste Datei hochladen
                </motion.button>
              )}
            </div>
          </StaggerItem>
        ) : (
          filtered.map((file, idx) => (
            <StaggerItem key={file.id}>
              <FileCard file={file} index={idx} onDelete={setDeleteTarget} onPreview={() => {}} />
            </StaggerItem>
          ))
        )}
        <div className="h-8" />
      </StaggerContainer>

      {/* Upload Modal */}
      <AnimatePresence>
        <UploadModal visible={showUpload} onClose={() => setShowUpload(false)} onUpload={handleUpload} />
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Datei löschen?"
        message={`„${deleteTarget?.title || ""}" wird unwiderruflich gelöscht.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Löschen"
        isDestructive
      />

      <Toast visible={toast.visible} message={toast.message} subMessage={toast.subMessage} type={toast.type} onDone={() => setToast(prev => ({ ...prev, visible: false }))} />
    </PageTransition>
    </div>
  );
}
