import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

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

// SVG clip-path polygons for three pie slices (center = 50% 50%)
// Top slice: center → top-left → top-right → center-right (120° each)
const CLIP_PATHS = [
  "polygon(50% 50%, 50% 0%, 100% 0%, 100% 75%)",       // top-right slice
  "polygon(50% 50%, 100% 75%, 50% 100%, 0% 100%, 0% 75%)", // bottom slice
  "polygon(50% 50%, 0% 75%, 0% 0%, 50% 0%)",            // top-left slice
];

export default function TherapistDashboardTiles({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      aria-label="Hauptnavigation Therapeut"
      className="relative w-full"
      style={{ height: "calc(100vh - 10rem)", minHeight: "28rem" }}
    >
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
            animate={{
              opacity: otherHovered ? 0.55 : 1,
              scale: isHovered ? 1.015 : 1,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Background image */}
            <motion.img
              src={slice.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.08 : 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />

            {/* Overlay */}
            <motion.div
              className="absolute inset-0"
              animate={{
                background: isHovered
                  ? "linear-gradient(to top, hsla(200,35%,12%,0.85) 0%, hsla(200,35%,12%,0.3) 60%, transparent 100%)"
                  : "linear-gradient(to top, hsla(200,35%,12%,0.7) 0%, hsla(200,35%,12%,0.25) 50%, transparent 100%)",
              }}
              transition={{ duration: 0.4 }}
            />

            {/* Label – positioned at each slice's visual center */}
            <div
              className="absolute z-10 flex flex-col items-center text-center pointer-events-none"
              style={getLabelPosition(i)}
            >
              <motion.h2
                className="text-primary-foreground text-2xl sm:text-3xl lg:text-4xl font-black leading-tight drop-shadow-lg"
                animate={{ y: isHovered ? -4 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {slice.label}
              </motion.h2>
              <motion.p
                className="text-primary-foreground/80 text-xs sm:text-sm font-medium mt-1 max-w-[10rem]"
                animate={{ opacity: isHovered ? 1 : 0.7 }}
                transition={{ duration: 0.3 }}
              >
                {slice.description}
              </motion.p>
              <motion.span
                className="inline-flex items-center gap-1.5 mt-3 text-primary-foreground font-bold text-sm"
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                transition={{ duration: 0.3 }}
              >
                Öffnen <ArrowRight size={14} />
              </motion.span>
            </div>
          </motion.button>
        );
      })}

      {/* Thin divider lines from center */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1="50" y1="50" x2="50" y2="0" stroke="white" strokeOpacity="0.15" strokeWidth="0.15" />
        <line x1="50" y1="50" x2="100" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="0.15" />
        <line x1="50" y1="50" x2="0" y2="75" stroke="white" strokeOpacity="0.15" strokeWidth="0.15" />
      </svg>
    </section>
  );
}

function getLabelPosition(index: number): React.CSSProperties {
  switch (index) {
    case 0: // top-right
      return { top: "25%", left: "68%", transform: "translate(-50%, -50%)" };
    case 1: // bottom
      return { top: "78%", left: "50%", transform: "translate(-50%, -50%)" };
    case 2: // top-left
      return { top: "25%", left: "32%", transform: "translate(-50%, -50%)" };
    default:
      return {};
  }
}
