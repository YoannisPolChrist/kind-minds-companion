import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Settings } from "lucide-react";

interface Slice {
  path: string;
  label: string;
  description: string;
  image: string;
}

const SLICES: Slice[] = [
  {
    path: "/therapist/clients",
    label: "Klienten",
    description: "Begleitung & Fortschritt",
    image: "/images/HomeUi2.webp",
  },
  {
    path: "/therapist/templates",
    label: "Vorlagen",
    description: "Übungen erstellen & zuweisen",
    image: "/images/HomeUi4.webp",
  },
  {
    path: "/therapist/resources",
    label: "Bibliothek",
    description: "Dateien, Links & Materialien",
    image: "/images/HomeUi6.webp",
  },
];

const CLIP_PATHS = [
  "polygon(50% 50%, 50% 0%, 100% 0%, 100% 75%)",
  "polygon(50% 50%, 100% 75%, 50% 100%, 0% 100%, 0% 75%)",
  "polygon(50% 50%, 0% 75%, 0% 0%, 50% 0%)",
];

export default function TherapistDashboardTiles({
  onNavigate,
  onOpenSettings,
  therapistName,
}: {
  onNavigate: (path: string) => void;
  onOpenSettings: () => void;
  therapistName?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section aria-label="Hauptnavigation Therapeut" className="relative w-full h-screen min-h-[32rem] overflow-hidden">
      {SLICES.map((slice, i) => {
        const isHovered = hovered === i;
        const otherHovered = hovered !== null && hovered !== i;

        return (
          <motion.button
            key={slice.path}
            onClick={() => onNavigate(slice.path)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden focus:outline-none"
            style={{ clipPath: CLIP_PATHS[i] }}
            animate={{ opacity: otherHovered ? 0.58 : 1, scale: isHovered ? 1.02 : 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <motion.img
              src={slice.image}
              alt={slice.label}
              className="absolute inset-0 w-full h-full object-cover object-center"
              animate={{ scale: isHovered ? 1.1 : 1.03 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/45 to-primary-dark/15" />

            <div className="absolute z-10 flex flex-col items-center text-center pointer-events-none" style={getLabelPosition(i)}>
              <motion.h2
                className="text-primary-foreground text-2xl sm:text-3xl lg:text-4xl font-black leading-tight drop-shadow-lg"
                animate={{ y: isHovered ? -4 : 0 }}
                transition={{ duration: 0.25 }}
              >
                {slice.label}
              </motion.h2>
              <motion.p
                className="text-primary-foreground/85 text-xs sm:text-sm font-medium mt-1 max-w-[12rem]"
                animate={{ opacity: isHovered ? 1 : 0.8 }}
                transition={{ duration: 0.25 }}
              >
                {slice.description}
              </motion.p>
              <motion.span
                className="inline-flex items-center gap-1.5 mt-3 text-primary-foreground font-bold text-sm"
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                transition={{ duration: 0.25 }}
              >
                Öffnen <ArrowRight size={14} />
              </motion.span>
            </div>
          </motion.button>
        );
      })}

      <motion.button
        type="button"
        onClick={onOpenSettings}
        className="absolute z-30 top-6 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/25 text-primary-foreground backdrop-blur-sm transition-colors"
        whileHover={{ scale: 1.06, y: -1 }}
        whileTap={{ scale: 0.96 }}
        aria-label="Einstellungen öffnen"
      >
        <Settings size={20} />
      </motion.button>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 text-primary-foreground/30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50" y1="50" x2="50" y2="0" stroke="currentColor" strokeWidth="0.14" />
        <line x1="50" y1="50" x2="100" y2="75" stroke="currentColor" strokeWidth="0.14" />
        <line x1="50" y1="50" x2="0" y2="75" stroke="currentColor" strokeWidth="0.14" />
      </svg>
    </section>
  );
}

function getLabelPosition(index: number): React.CSSProperties {
  switch (index) {
    case 0:
      return { top: "24%", left: "69%", transform: "translate(-50%, -50%)" };
    case 1:
      return { top: "79%", left: "50%", transform: "translate(-50%, -50%)" };
    case 2:
      return { top: "24%", left: "31%", transform: "translate(-50%, -50%)" };
    default:
      return {};
  }
}

