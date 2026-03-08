import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, getDocs, where, addDoc, deleteDoc, doc,
  serverTimestamp, updateDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import {
  ArrowLeft, FileText, Trash2, PlusCircle, Send, X, Search,
  Star, Tag, Clock, Eye, Link as LinkIcon, Film, Download,
  Upload, Check, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, StaggerContainer, StaggerItem, HeaderOrbs, PressableScale } from "../../components/motion";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { BannerToast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { getStorage } from "firebase/storage";

const storage = getStorage();

const HEADER_IMAGES = [
  "/images/nature-header-1.webp", "/images/nature-header-2.webp",
  "/images/nature-header-3.webp", "/images/nature-header-4.webp",
];
const headerImg = HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)];

// ─── Type Config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  document: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", label: "Dokument", icon: "📄" },
  file:     { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", label: "Datei",    icon: "📄" },
  pdf:      { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    label: "PDF",      icon: "📋" },
  video:    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", label: "Video",    icon: "🎥" },
  image:    { bg: "bg-pink-50",   border: "border-pink-200",   text: "text-pink-600",   label: "Bild",     icon: "🖼️" },
  link:     { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   label: "Web Link", icon: "🔗" },
};

function getCfg(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.file;
}

const FILTER_OPTIONS = [
  { key: "all", label: "Alle" },
  { key: "documents", label: "Dokumente" },
  { key: "media", label: "Medien" },
  { key: "links", label: "Links" },
] as const;

// ─── Add Resource Modal ──────────────────────────────────────────────────────

function AddResourceModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [resourceType, setResourceType] = useState<"file" | "link">("link");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setTagsInput("");
    setError("");
  };

  const handleAddLink = async () => {
    if (!title || !linkUrl) {
      setError("Bitte gib Titel und Link an.");
      return;
    }
    setUploading(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await addDoc(collection(db, "resources"), {
        title,
        description,
        type: "link",
        url: linkUrl,
        isPinned: false,
        tags,
        createdAt: serverTimestamp(),
      });
      reset();
      onClose();
      onSaved();
    } catch (e) {
      console.error(e);
      setError("Speichern fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!title) {
      setError("Bitte gib einen Titel an.");
      return;
    }
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "*/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
          const filename = `resources/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, filename);
          const { uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
          const task = uploadBytesResumable(storageRef, file);
          await new Promise<void>((res, rej) => {
            task.on("state_changed", null, rej, () => res());
          });
          const downloadUrl = await getDownloadURL(storageRef);

          let fileType = "document";
          if (file.type.startsWith("image/")) fileType = "image";
          else if (file.type.startsWith("video/")) fileType = "video";
          else if (file.type === "application/pdf") fileType = "pdf";

          const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
          await addDoc(collection(db, "resources"), {
            title,
            description,
            type: fileType,
            url: downloadUrl,
            storagePath: filename,
            originalName: file.name,
            isPinned: false,
            tags,
            createdAt: serverTimestamp(),
          });

          reset();
          onClose();
          onSaved();
        } catch (err) {
          console.error(err);
          setError("Upload fehlgeschlagen.");
        } finally {
          setUploading(false);
        }
      };
      input.click();
    } catch (err) {
      console.error(err);
      setError("Dateiauswahl fehlgeschlagen.");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-foreground">Ressource hinzufügen</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2 mb-5">
            {(["link", "file"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setResourceType(t)}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                  resourceType === t
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "link" ? "🔗 Link" : "📁 Datei"}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm font-bold rounded-2xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Titel *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="z.B. Arbeitsblatt Achtsamkeit"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Optionale Beschreibung..."
              />
            </div>

            {resourceType === "link" && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">URL *</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="https://..."
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tags (kommagetrennt)</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-secondary border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="achtsamkeit, übung, therapie"
              />
            </div>
          </div>

          <button
            onClick={resourceType === "link" ? handleAddLink : handleUploadFile}
            disabled={uploading}
            className="w-full mt-6 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-base disabled:opacity-50 shadow-lg transition-all hover:opacity-90"
          >
            {uploading ? "Wird gespeichert..." : resourceType === "link" ? "Link hinzufügen" : "Datei auswählen & hochladen"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Assign Modal ────────────────────────────────────────────────────────────

function AssignModal({
  open,
  onClose,
  resources: resourcesToAssign,
  clients,
  therapistId,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  resources: any[];
  clients: any[];
  therapistId: string;
  onAssigned: (msg: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const confirm = async () => {
    if (selected.length === 0) return;
    setAssigning(true);
    try {
      const promises: Promise<any>[] = [];
      for (const clientId of selected) {
        for (const res of resourcesToAssign) {
          promises.push(
            addDoc(collection(db, "client_resources"), {
              clientId,
              therapistId,
              title: res.title,
              description: res.description || "",
              type: res.type,
              url: res.url || "",
              originalName: res.originalName || null,
              storagePath: res.storagePath || null,
              originalResourceId: res.id,
              createdAt: serverTimestamp(),
            })
          );
        }
        promises.push(
          addDoc(collection(db, "notifications"), {
            userId: clientId,
            type: "FILE_UPLOAD",
            title: "Neue Ressource",
            body: "Hey, für dich wurde neues Material hinterlegt!",
            message: "Hey, für dich wurde neues Material hinterlegt!",
            read: false,
            createdAt: serverTimestamp(),
          })
        );
      }
      await Promise.all(promises);
      const msg = `${resourcesToAssign.length} Ressource(n) an ${selected.length} Klient(en) zugewiesen.`;
      onAssigned(msg);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-card rounded-3xl border border-border shadow-2xl w-full max-w-md mx-4 p-6"
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-foreground">Klienten auswählen</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {resourcesToAssign.length} Ressource(n) zuweisen an:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
            {clients.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Keine Klienten vorhanden.</p>
            ) : (
              clients.map((c: any) => {
                const isSelected = selected.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isSelected ? "bg-primary/10 border-primary/30" : "bg-secondary border-border hover:border-primary/20"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary" : "border-2 border-muted-foreground/30"}`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-bold text-foreground">{c.firstName} {c.lastName}</span>
                  </button>
                );
              })
            )}
          </div>
          <button
            onClick={confirm}
            disabled={selected.length === 0 || assigning}
            className="w-full py-3.5 rounded-2xl bg-foreground text-background font-black disabled:opacity-40 transition-all"
          >
            {assigning ? "Wird zugewiesen..." : `An ${selected.length} Klient(en) zuweisen`}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────

function PreviewModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const cfg = getCfg(resource.type);
  const openExternal = () => {
    let url = resource.url;
    if (!url.startsWith("http")) url = "https://" + url;
    window.open(url, "_blank");
  };
  const previewUrl =
    resource.type === "pdf" || resource.type === "document"
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resource.url)}`
      : resource.url;

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative mt-auto bg-background rounded-t-[2rem] flex flex-col max-h-[92vh] overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 200 }}
      >
        <div className="flex items-center justify-between px-6 py-5 rounded-t-[2rem]" style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))" }}>
          <h2 className="text-white text-xl font-black truncate max-w-[80%]">{resource.title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>
        <div className="bg-card p-6 border-b border-border">
          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest mb-3 ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
          {resource.description && <p className="text-muted-foreground text-[15px] leading-relaxed mb-4">{resource.description}</p>}
          <PressableScale onClick={openExternal}>
            <div className="flex items-center justify-center gap-2 py-4 rounded-[20px] text-white font-bold shadow-lg" style={{ backgroundColor: "#C09D59" }}>
              <Download size={20} />
              <span>{resource.type === "link" ? "Im Browser öffnen" : "Herunterladen"}</span>
            </div>
          </PressableScale>
        </div>
        <div className="flex-1 m-4 mb-8 rounded-[2rem] overflow-hidden border border-border bg-secondary/50 min-h-[300px]">
          {resource.type === "image" ? (
            <img src={resource.url} alt={resource.title} className="w-full h-full object-contain" />
          ) : (
            <iframe src={previewUrl} className="w-full h-full min-h-[400px] border-none" title={resource.title} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TherapistResources() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{ open: boolean; resources: any[] }>({ open: false, resources: [] });
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "resources")));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setResources(data);
    } catch (e) {
      console.error("Error fetching resources:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "client"), where("therapistId", "==", profile.id))
      );
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c: any) => !c.isArchived));
    } catch (e) {
      console.error(e);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchResources();
    fetchClients();
  }, [fetchResources, fetchClients]);

  const handleDelete = (item: any) => {
    setConfirmModal({
      title: "Ressource löschen",
      message: `Möchtest du "${item.title}" wirklich löschen?`,
      onConfirm: async () => {
        try {
          if (item.type !== "link" && item.storagePath) {
            try { await deleteObject(ref(storage, item.storagePath)); } catch {}
          }
          await deleteDoc(doc(db, "resources", item.id));
          setResources((p) => p.filter((r) => r.id !== item.id));
          setToast({ message: "Ressource gelöscht", type: "success" });
        } catch (e) {
          setToast({ message: "Löschen fehlgeschlagen", type: "error" });
        }
        setConfirmModal(null);
      },
    });
  };

  const handleTogglePin = async (item: any) => {
    try {
      await updateDoc(doc(db, "resources", item.id), { isPinned: !item.isPinned });
      setResources((p) => p.map((r) => (r.id === item.id ? { ...r, isPinned: !r.isPinned } : r)));
    } catch (e) {
      console.error(e);
    }
  };

  // Filter
  let filtered = resources.filter((res: any) => {
    const matchSearch =
      res.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.tags && res.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    let matchFilter = true;
    if (activeFilter === "documents") matchFilter = ["document", "pdf", "file"].includes(res.type);
    else if (activeFilter === "media") matchFilter = ["image", "video"].includes(res.type);
    else if (activeFilter === "links") matchFilter = res.type === "link";
    return matchSearch && matchFilter;
  });

  filtered.sort((a: any, b: any) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Toast */}
      {toast && (
        <BannerToast
          visible={true}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          visible={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Löschen"
          isDestructive
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Header – matching TherapistDashboard / Templates style */}
      <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2.5rem] shadow-xl shadow-primary/15 relative overflow-hidden">
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-soft-light" />
        <HeaderOrbs />
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-8 relative z-10">
          <div className="flex items-center justify-between mb-5">
            <motion.button
              onClick={() => navigate("/therapist")}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-2xl text-sm font-bold"
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={16} /> Zurück
            </motion.button>
            <PressableScale onClick={() => setAddModalOpen(true)}>
              <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors">
                <PlusCircle size={16} /> Hinzufügen
              </div>
            </PressableScale>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Bibliothek</h1>
          <p className="text-white/70 text-sm font-medium mt-1">Ressourcen & Materialien für deine Klienten verwalten.</p>

          {/* Search in header */}
          <div className="mt-6 relative">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Bibliothek durchsuchen..."
              className="w-full pl-12 pr-10 py-4 bg-white/15 border border-white/25 rounded-2xl text-white font-bold placeholder-white/50 focus:outline-none text-lg"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/15 p-1.5 rounded-lg">
                <X size={16} className="text-white/80" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Filter chips */}
        <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setActiveFilter(opt.key)}
                className={`px-4 py-2.5 rounded-[20px] text-sm font-extrabold tracking-wide transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-foreground text-background shadow-lg"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </motion.div>

        {/* Resource list */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="bg-card rounded-3xl border border-border p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-4xl mb-4">📚</p>
            <h2 className="text-lg font-bold text-foreground mb-1">Keine Ressourcen</h2>
            <p className="text-muted-foreground">
              {searchQuery ? "Keine Ergebnisse für deine Suche." : "Füge deine erste Ressource hinzu."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item: any, idx: number) => {
              const cfg = getCfg(item.type);
              return (
                <motion.div
                  key={item.id}
                  className={`bg-card rounded-[28px] border-[1.5px] overflow-hidden shadow-sm ${item.isPinned ? "border-amber-300" : "border-border"}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4), type: "spring", damping: 20, stiffness: 120 }}
                >
                  {/* Pinned banner */}
                  {item.isPinned && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-1.5 flex items-center gap-1.5 border-b border-amber-200">
                      <Star size={12} className="text-amber-600 fill-amber-600" />
                      <span className="text-[11px] font-extrabold text-amber-700 tracking-wider">ANGEHEFTET</span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Top row */}
                    <div className="flex items-start gap-3.5">
                      <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${cfg.bg} ${cfg.border}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[17px] font-extrabold text-foreground leading-tight line-clamp-2 flex-1">
                            {item.title}
                          </h3>
                          <button onClick={() => handleTogglePin(item)} className="shrink-0 p-1">
                            <Star size={20} className={item.isPinned ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"} />
                          </button>
                        </div>
                        <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="mt-3.5 bg-secondary rounded-[14px] p-3 border border-border">
                        <p className="text-sm text-muted-foreground leading-5 font-medium">{item.description}</p>
                      </div>
                    )}

                    {/* Tags */}
                    {item.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {item.tags.map((tag: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-full text-xs font-bold text-muted-foreground">
                            <Tag size={11} className="text-muted-foreground/50" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border justify-end">
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-[14px] text-red-500 font-bold text-[13px] hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={15} /> Löschen
                      </button>
                      <button
                        onClick={() => setPreviewResource(item)}
                        className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Eye size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setAssignModal({ open: true, resources: [item] })}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-foreground text-background rounded-[14px] font-extrabold text-sm shadow-lg hover:opacity-90 transition-opacity"
                      >
                        <Send size={15} className="text-accent" /> Zuweisen
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Modals */}
      <AddResourceModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onSaved={() => { fetchResources(); setToast({ message: "Ressource hinzugefügt!", type: "success" }); }} />
      <AssignModal
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, resources: [] })}
        resources={assignModal.resources}
        clients={clients}
        therapistId={profile?.id || ""}
        onAssigned={(msg) => setToast({ message: msg, type: "success" })}
      />
      {previewResource && <PreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />}
    </PageTransition>
  );
}
