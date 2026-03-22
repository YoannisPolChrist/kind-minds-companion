import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface Slice {
  path: string;
  label: string;
  description: string;
  image: string;
}

const SLICES: Slice[] = [
  {
    path: "/therapist/resources",
    label: "Bibliothek",
    description: "Dateien, Links & Materialien",
    image: "/images/HomeUi2.webp",
  },
  {
    path: "/therapist/clients",
    label: "Klienten",
    description: "Begleitung & Fortschritt",
    image: "/images/HomeUi3.webp",
  },
  {
    path: "/therapist/templates",
    label: "Vorlagen",
    description: "Übungen erstellen & zuweisen",
    image: "/images/HomeUi4.webp",
  },
];

const CLIP_PATHS = [
  "polygon(0 0, 50% 0, 50% 52%, 0 74%)",
  "polygon(50% 0, 100% 0, 100% 74%, 50% 52%)",
  "polygon(0 74%, 50% 52%, 100% 74%, 100% 100%, 0 100%)",
];

const DESKTOP_POSITIONS: React.CSSProperties[] = [
  { top: "22%", left: "31%", transform: "translate(-50%, -50%)" },
  { top: "22%", left: "69%", transform: "translate(-50%, -50%)" },
  { top: "77%", left: "50%", transform: "translate(-50%, -50%)" },
];

const MOBILE_POSITIONS: React.CSSProperties[] = [
  { top: "18%", left: "30%", transform: "translate(-50%, -50%)" },
  { top: "18%", left: "70%", transform: "translate(-50%, -50%)" },
  { top: "72%", left: "50%", transform: "translate(-50%, -50%)" },
];

export default function TherapistDashboardTiles({
  onNavigate,
  therapistName,
}: {
  onNavigate: (path: string) => void;
  therapistName?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      aria-label="Hauptnavigation Therapeut"
      className="relative h-screen min-h-[42rem] w-full overflow-hidden bg-primary-dark"
    >
      <div className="absolute inset-0">
        {SLICES.map((slice, index) => {
          const isHovered = hovered === index;
          const otherHovered = hovered !== null && hovered !== index;

          return (
            <motion.button
              key={slice.path}
              type="button"
              onClick={() => onNavigate(slice.path)}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="absolute inset-0 h-full w-full cursor-pointer overflow-hidden focus:outline-none"
              style={{ clipPath: CLIP_PATHS[index] }}
              animate={{
                opacity: otherHovered ? 0.58 : 1,
                scale: isHovered ? 1.02 : 1,
              }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              whileTap={{ scale: 0.99 }}
            >
              <motion.img
                src={slice.image}
                alt={slice.label}
                className="absolute inset-0 h-full w-full object-cover"
                animate={{ scale: isHovered ? 1.06 : 1.01 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                loading="lazy"
              />

              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,16,24,0.18),rgba(9,16,24,0.3)_45%,rgba(9,16,24,0.72))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent_55%)] opacity-50" />

              <div
                className="absolute z-10 hidden flex-col items-center text-center text-primary-foreground sm:flex"
                style={DESKTOP_POSITIONS[index]}
              >
                <motion.h2
                  className="text-5xl font-black leading-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
                  animate={{ y: isHovered ? -4 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {slice.label}
                </motion.h2>
                <motion.p
                  className="mt-3 text-lg font-semibold text-primary-foreground/78 drop-shadow-[0_8px_20px_rgba(0,0,0,0.22)]"
                  animate={{ opacity: isHovered ? 1 : 0.88 }}
                  transition={{ duration: 0.25 }}
                >
                  {slice.description}
                </motion.p>
                <motion.span
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary-foreground/88"
                  animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
                  transition={{ duration: 0.25 }}
                >
                  Öffnen <ArrowRight size={14} />
                </motion.span>
              </div>

              <div
                className="absolute z-10 flex flex-col items-center text-center text-primary-foreground sm:hidden"
                style={MOBILE_POSITIONS[index]}
              >
                <h2 className="text-3xl font-black leading-tight drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
                  {slice.label}
                </h2>
                <p className="mt-2 max-w-[11rem] text-sm font-semibold text-primary-foreground/82">
                  {slice.description}
                </p>
              </div>
            </motion.button>
          );
        })}

        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full text-primary-foreground/34"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line x1="50" y1="0" x2="50" y2="52" stroke="currentColor" strokeWidth="0.12" />
          <line x1="50" y1="52" x2="0" y2="74" stroke="currentColor" strokeWidth="0.12" />
          <line x1="50" y1="52" x2="100" y2="74" stroke="currentColor" strokeWidth="0.12" />
        </svg>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-9 z-30 -translate-x-1/2 select-none text-center">
        <div className="rounded-[1.9rem] border border-white/25 bg-white/22 px-9 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/78">
            Willkommen
          </p>
          <h1 className="text-5xl font-black leading-none tracking-tight text-white drop-shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
            {therapistName || "Therapeut"}
          </h1>
        </div>
      </div>

      <motion.div
        className="absolute bottom-6 right-6 z-30"
        whileHover={{ scale: 1.06, y: -1 }}
        whileTap={{ scale: 0.96 }}
      >
        <Link
          to="/settings"
          onClick={(event) => event.stopPropagation()}
          className="block rounded-full border border-white/20 bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/16"
          aria-label="Einstellungen öffnen"
        >
          <Settings size={18} />
        </Link>
      </motion.div>
    </section>
  );
}
