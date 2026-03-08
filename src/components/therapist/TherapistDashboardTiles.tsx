import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

interface DashboardTile {
  path: string;
  label: string;
  description: string;
  image: string;
  imageAlt: string;
}

const TILES: DashboardTile[] = [
  {
    path: "/therapist/clients",
    label: "Klienten",
    description: "Begleitung, Fortschritt und direkte Einträge",
    image: "/images/HomeUi2.webp",
    imageAlt: "Menschen im Gespräch",
  },
  {
    path: "/therapist/templates",
    label: "Vorlagen",
    description: "Übungen erstellen und schnell zuweisen",
    image: "/images/HomeUi4.webp",
    imageAlt: "Dokumente und Vorlagen",
  },
  {
    path: "/therapist/resources",
    label: "Bibliothek",
    description: "Dateien, Links und Materialien zentral",
    image: "/images/HomeUi6.webp",
    imageAlt: "Bibliotheksregal mit Büchern",
  },
];

export default function TherapistDashboardTiles({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  return (
    <section aria-label="Hauptnavigation Therapeut" className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {TILES.map((tile, index) => (
          <motion.button
            key={tile.path}
            onClick={() => onNavigate(tile.path)}
            className="relative min-h-[24rem] sm:min-h-[28rem] rounded-3xl overflow-hidden border border-border text-left group"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.08, type: "spring", damping: 18 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
          >
            <img
              src={tile.image}
              alt={tile.imageAlt}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/55 to-primary-dark/10" />

            <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-7">
              <p className="text-primary-foreground/75 text-xs uppercase tracking-[0.2em] font-bold mb-2">Bereich</p>
              <h2 className="text-primary-foreground text-3xl sm:text-4xl font-black leading-tight">{tile.label}</h2>
              <p className="text-primary-foreground/85 text-sm mt-2 max-w-sm">{tile.description}</p>
              <span className="inline-flex items-center gap-2 mt-5 text-primary-foreground font-bold text-sm">
                Öffnen <ArrowRight size={16} />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
