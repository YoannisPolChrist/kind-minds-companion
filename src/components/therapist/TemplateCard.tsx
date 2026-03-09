import { motion } from "motion/react";
import { LayoutTemplate, Trash2, Send, FileText } from "lucide-react";
import { normalizeHslColor, withHslAlpha } from "../../utils/hslColor";

export default function TemplateCard({
  tpl,
  onEdit,
  onAssign,
  onDelete,
}: {
  tpl: any;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const accent = normalizeHslColor(tpl?.themeColor || "hsl(var(--primary))");
  const accentBorder = withHslAlpha(accent, 0.28);
  const accentSoft = withHslAlpha(accent, 0.12);
  const accentSofter = withHslAlpha(accent, 0.07);
  const accentShadow = withHslAlpha(accent, 0.22);

  const blockCount = tpl?.blocks?.length || 0;

  return (
    <motion.div
      className="bg-card rounded-3xl border-[1.5px] relative group transition-colors overflow-hidden"
      style={{ borderColor: accentBorder }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: `0 18px 50px ${accentShadow}` }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >

      <button
        onClick={onDelete}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/15"
        aria-label="Vorlage löschen"
      >
        <Trash2 size={14} className="text-destructive" />
      </button>

      {/* Cover */}
      {tpl?.coverImage ? (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <img
            src={tpl.coverImage}
            alt={`Titelbild von ${tpl.title}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 will-change-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-card/10 to-transparent" />
        </div>
      ) : (
        <div
          className="h-40 w-full flex items-center justify-center"
          style={{ backgroundColor: accentSofter }}
        >
          <LayoutTemplate size={28} style={{ color: accent }} />
        </div>
      )}

      <div className="p-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 border"
          style={{ backgroundColor: accentSoft, borderColor: accentBorder }}
        >
          <LayoutTemplate size={18} style={{ color: accent }} />
        </div>

        <h3 className="text-base font-black text-foreground tracking-tight mb-1 line-clamp-2">
          {tpl?.title}
        </h3>

        <span className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
          <FileText size={11} />
          {blockCount} {blockCount === 1 ? "Modul" : "Module"}
        </span>

        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          <button
            onClick={onEdit}
            className="flex-1 bg-secondary border border-border py-2.5 rounded-xl text-foreground font-bold text-center text-sm hover:bg-muted transition-colors"
          >
            Bearbeiten
          </button>
          <button
            onClick={onAssign}
            className="flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-sm border transition-colors"
            style={{ backgroundColor: accentSoft, borderColor: accentBorder, color: accent }}
          >
            <Send size={13} /> Zuweisen
          </button>
        </div>
      </div>
    </motion.div>
  );
}
