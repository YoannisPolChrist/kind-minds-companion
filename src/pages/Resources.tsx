import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore/lite";
import { dbLite } from "../lib/firebaseDbLite";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { translate } from "../lib/webLocale";
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

const TYPE_CONFIG: Record<string, { icon: typeof FileText; bg: string; text: string; btnColor: string }> = {
  document: { icon: FileText, bg: "bg-indigo-50", text: "text-indigo-600", btnColor: "hsl(var(--primary))" },
  pdf:      { icon: FileText, bg: "bg-red-50", text: "text-red-600", btnColor: "#DC2626" },
  video:    { icon: Film, bg: "bg-purple-50", text: "text-purple-600", btnColor: "#C09D59" },
  image:    { icon: ImageIcon, bg: "bg-pink-50", text: "text-pink-600", btnColor: "#DB2777" },
  link:     { icon: LinkIcon, bg: "bg-blue-50", text: "text-blue-600", btnColor: "hsl(var(--primary))" },
};

function getTypeConfig(type: string, locale: string) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.link;
  const label =
    type === "document"
      ? translate(locale, { de: "Geteiltes Dokument", en: "Shared document", es: "Documento compartido", fr: "Document partagé", it: "Documento condiviso" })
      : type === "pdf"
        ? translate(locale, { de: "PDF Dokument", en: "PDF document", es: "Documento PDF", fr: "Document PDF", it: "Documento PDF" })
        : type === "video"
          ? translate(locale, { de: "Video", en: "Video", es: "Vídeo", fr: "Vidéo", it: "Video" })
          : type === "image"
            ? translate(locale, { de: "Bild", en: "Image", es: "Imagen", fr: "Image", it: "Immagine" })
            : translate(locale, { de: "Web Link", en: "Web link", es: "Enlace web", fr: "Lien web", it: "Link web" });

  return { ...config, label };
}

// ─── Resource Card ───────────────────────────────────────────────────────────

function ResourceCard({
  resource,
  index,
  onPreview,
  locale,
}: {
  resource: Resource;
  index: number;
  onPreview: (r: Resource) => void;
  locale: string;
}) {
  const cfg = getTypeConfig(resource.type, locale);
  const TypeIcon = cfg.icon;

  return (
    <motion.div
      className="bg-card rounded-[28px] border border-border p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, type: "spring", damping: 20, stiffness: 120 }}
    >
      {/* Header row */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
          <TypeIcon size={22} className={cfg.text} />
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
            {resource.type === "video"
              ? translate(locale, { de: "Video ansehen", en: "Watch video", es: "Ver vídeo", fr: "Voir la vidéo", it: "Guarda il video" })
              : resource.type === "image"
                ? translate(locale, { de: "Bild ansehen", en: "View image", es: "Ver imagen", fr: "Voir l'image", it: "Guarda l'immagine" })
                : translate(locale, { de: "Details & Vorschau", en: "Details & preview", es: "Detalles y vista previa", fr: "Détails et aperçu", it: "Dettagli e anteprima" })}
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
  locale,
}: {
  resource: Resource;
  onClose: () => void;
  locale: string;
}) {
  const cfg = getTypeConfig(resource.type, locale);

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
        className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-6"
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
          className="relative mt-auto flex w-full flex-col overflow-hidden bg-background rounded-t-[2rem] max-h-[92vh] md:mt-0 md:max-w-5xl md:rounded-[2rem] md:border md:border-border md:shadow-2xl"
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
                  {resource.type === "link"
                    ? translate(locale, { de: "Im Browser öffnen", en: "Open in browser", es: "Abrir en el navegador", fr: "Ouvrir dans le navigateur", it: "Apri nel browser" })
                    : translate(locale, { de: "Speichern / Herunterladen", en: "Save / download", es: "Guardar / descargar", fr: "Enregistrer / télécharger", it: "Salva / scarica" })}
                </span>
              </div>
            </PressableScale>
          </div>

          {/* Preview */}
          <div className="m-4 mb-8 flex-1 overflow-hidden rounded-[2rem] border border-border bg-secondary/50 min-h-[300px] md:m-6 md:min-h-[520px]">
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
  const { locale } = useLanguage();
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
      const qGlobal = query(collection(dbLite, "resources"));
      const qClient = query(collection(dbLite, "client_resources"), where("clientId", "==", profile.id));
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

  const text = {
    back: translate(locale, { de: "Zurück", en: "Back", es: "Volver", fr: "Retour", it: "Indietro" }),
    library: translate(locale, { de: "Bibliothek", en: "Library", es: "Biblioteca", fr: "Bibliothèque", it: "Libreria" }),
    noResources: translate(locale, { de: "Keine Ressourcen", en: "No resources", es: "Sin recursos", fr: "Aucune ressource", it: "Nessuna risorsa" }),
    noResourcesBody: translate(locale, {
      de: "Dein Therapeut hat noch keine Dokumente hinterlegt.",
      en: "Your therapist has not shared any documents yet.",
      es: "Tu terapeuta todavía no ha compartido documentos.",
      fr: "Ton thérapeute n'a pas encore partagé de documents.",
      it: "Il tuo terapeuta non ha ancora condiviso documenti.",
    }),
  };

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
        <img src={headerImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
        <HeaderOrbs />
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-12">
          <motion.button
            onClick={() => navigate("/")}
            className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/25"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            {text.back}
          </motion.button>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-black tracking-tight text-white">{text.library}</h1>
          </div>
        </div>
      </motion.div>

      <div data-tour-id="resources-main" className="max-w-6xl mx-auto px-5 py-6">
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
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
            <div className="w-16 h-16 rounded-3xl bg-secondary border border-border mx-auto mb-4 flex items-center justify-center">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">{text.noResources}</h2>
            <p className="text-muted-foreground leading-5">
              {text.noResourcesBody}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {resources.map((res, idx) => (
              <ResourceCard
                key={res.id}
                resource={res}
                index={idx}
                locale={locale}
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
          locale={locale}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </PageTransition>
  );
}
