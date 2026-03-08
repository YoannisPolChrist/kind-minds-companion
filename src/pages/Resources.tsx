import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeft, FileText, ExternalLink, Download, Eye, X,
  Link as LinkIcon, Image as ImageIcon, Film,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, PressableScale, HeaderOrbs } from "../components/motion";
import { SkeletonCard } from "../components/ui/Skeleton";
import { getRandomHeaderImage } from "../constants/headerImages";

const headerImg = getRandomHeaderImage();

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: "pdf" | "link" | "document" | "image" | "video";
  url: string;
  fileSize?: number;
  createdAt?: any;
  clientId?: string;
  isGlobal?: boolean;
}

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; btnColor: string }> = {
  document: { label: "Geteiltes Dokument", emoji: "📝", bg: "bg-indigo-50", text: "text-indigo-600", btnColor: "hsl(var(--primary))" },
  pdf:      { label: "PDF Dokument",       emoji: "📄", bg: "bg-red-50",    text: "text-red-600",    btnColor: "#DC2626" },
  video:    { label: "Video",              emoji: "🎥", bg: "bg-purple-50", text: "text-purple-600", btnColor: "#C09D59" },
  image:    { label: "Bild",               emoji: "🖼️", bg: "bg-pink-50",   text: "text-pink-600",   btnColor: "#DB2777" },
  link:     { label: "Web Link",           emoji: "🔗", bg: "bg-blue-50",   text: "text-blue-600",   btnColor: "hsl(var(--primary))" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.link;
}

// ─── Resource Card ───────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  index,
  onPreview,
}: {
  resource: Resource;
  index: number;
  onPreview: (r: Resource) => void;
}) {
  const cfg = getTypeConfig(resource.type);

  return (
    <motion.div
      className="bg-card rounded-[28px] border border-border p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, type: "spring", damping: 20, stiffness: 120 }}
    >
      {/* Header row */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl ${cfg.bg}`}>
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground leading-tight mb-1 line-clamp-2">
            {resource.title}
          </h3>
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {resource.description && (
        <p className="text-muted-foreground text-sm mb-5 leading-5 line-clamp-3">
          {resource.description}
        </p>
      )}

      {/* CTA Button */}
      <PressableScale onClick={() => onPreview(resource)}>
        <div
          className="flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-white font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: cfg.btnColor }}
        >
          <Eye size={18} />
          <span>
            {resource.type === "video" ? "Video ansehen" :
             resource.type === "image" ? "Bild ansehen" :
             "Details & Vorschau"}
          </span>
        </div>
      </PressableScale>
    </motion.div>
  );
}

// ─── Preview Modal ───────────────────────────────────────────────────────────

function PreviewModal({
  resource,
  onClose,
}: {
  resource: Resource;
  onClose: () => void;
}) {
  const cfg = getTypeConfig(resource.type);

  const openExternal = () => {
    let url = resource.url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    window.open(url, "_blank");
  };

  const getPreviewUrl = () => {
    if (resource.type === "pdf" || resource.type === "document") {
      // Use Google Docs viewer for PDFs
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resource.url)}`;
    }
    return resource.url;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative mt-auto bg-background rounded-t-[2rem] flex flex-col max-h-[92vh] overflow-hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 200 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-5 rounded-t-[2rem]"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))" }}
          >
            <h2 className="text-white text-xl font-black truncate max-w-[80%]">
              {resource.title}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Details section */}
          <div className="bg-card p-6 border-b border-border">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest mb-3 ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>

            {resource.description && (
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-4">
                {resource.description}
              </p>
            )}

            <PressableScale onClick={openExternal}>
              <div
                className="flex items-center justify-center gap-2 py-4 rounded-[20px] text-white font-bold shadow-lg"
                style={{ backgroundColor: "#C09D59", boxShadow: "0 4px 16px rgba(192,157,89,0.3)" }}
              >
                {resource.type !== "link" && <Download size={20} />}
                <span className="text-base">
                  {resource.type === "link" ? "Im Browser öffnen" : "Speichern / Herunterladen"}
                </span>
              </div>
            </PressableScale>
          </div>

          {/* Preview */}
          <div className="flex-1 m-4 mb-8 rounded-[2rem] overflow-hidden border border-border bg-secondary/50 min-h-[300px]">
            {resource.type === "image" ? (
              <img
                src={resource.url}
                alt={resource.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={getPreviewUrl()}
                className="w-full h-full min-h-[400px] border-none bg-transparent"
                title={resource.title}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Resources() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const fetchResources = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const data: Resource[] = [];

      // Fetch global + client-specific resources in parallel (same as native app)
      const qGlobal = query(collection(db, "resources"));
      const qClient = query(collection(db, "client_resources"), where("clientId", "==", profile.id));
      const [snapGlobal, snapClient] = await Promise.all([getDocs(qGlobal), getDocs(qClient)]);

      snapGlobal.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Resource);
      });
      snapClient.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Resource);
      });

      // Sort by creation time
      data.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      // Remove duplicates by URL
      const unique = data.filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i);
      setResources(unique);
    } catch (e) {
      console.error("Error fetching resources:", e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return (
    <PageTransition className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        className="rounded-b-[2rem] overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)))" }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/60 to-primary/50" />
        <HeaderOrbs />
        <div className="max-w-2xl mx-auto px-6 pt-14 pb-6 flex items-center justify-between relative z-10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white/[0.12] hover:bg-white/[0.2] border border-white/[0.15] px-4 py-2.5 rounded-[20px] transition-colors text-white/90 text-sm font-bold"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
          <h1 className="text-xl font-black text-white ml-4">Bibliothek</h1>
        </div>
      </motion.div>

      <div className="max-w-[860px] mx-auto px-6 py-6">
        {/* Subtitle */}
        <motion.p
          className="text-muted-foreground font-medium mb-6 leading-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Hier findest du hilfreiche Dokumente, Arbeitsblätter und Links, die dir von deinem Therapeuten zur Verfügung gestellt wurden.
        </motion.p>

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : resources.length === 0 ? (
          <motion.div
            className="bg-card rounded-3xl border border-border p-8 text-center shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <p className="text-4xl mb-4">📚</p>
            <h2 className="text-lg font-bold text-foreground mb-1">Keine Ressourcen</h2>
            <p className="text-muted-foreground leading-5">
              Dein Therapeut hat noch keine Dokumente hinterlegt.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {resources.map((res, idx) => (
              <ResourceCard
                key={res.id}
                resource={res}
                index={idx}
                onPreview={setSelectedResource}
              />
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* Preview Modal */}
      {selectedResource && (
        <PreviewModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </PageTransition>
  );
}
