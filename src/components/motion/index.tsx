/**
 * Reusable motion components ported from the Expo project's animation patterns:
 * - Block3DEntrance → StaggerItem (3D entrance with perspective)
 * - Block3DTiltWrapper → TiltCard (3D tilt on hover)
 * - AmbientOrbs → AmbientOrbs (floating background orbs)
 * - PressableScale → PressableScale (spring hover/tap)
 * - Page transitions → PageTransition
 */

import { motion, AnimatePresence, type Variants } from "motion/react";
import { type ReactNode, type CSSProperties, useState, useEffect } from "react";

// ─── TiltCard (inline) ────────────────────────────────────────────────────────

export function TiltCard({
  children,
  className,
  style,
  onClick,
  maxTilt = 6,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  maxTilt?: number;
}) {
  return (
    <motion.div
      className={className}
      style={{ perspective: 900, transformStyle: "preserve-3d", ...style }}
      onClick={onClick}
      whileHover={{
        rotateX: -maxTilt * 0.5,
        rotateY: maxTilt * 0.5,
        scale: 1.02,
        y: -3,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}

// ─── GlowCard (inline) ──────────────────────────────────────────────────────

export function GlowCard({
  children,
  className,
  style,
  onClick,
  glowColor,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  glowColor?: string;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

// ─── CountUp (inline) ───────────────────────────────────────────────────────

export function CountUp({
  to,
  duration = 1.2,
  className,
  suffix = "",
  prefix = "",
}: {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setValue(Math.round(to * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <span className={className}>{prefix}{value}{suffix}</span>;
}

// ─── Stagger Container + Item ────────────────────────────────────────────────
// Ported from Block3DEntrance: perspective + rotateX + scale entrance
// Enhanced with more dramatic values matching native Block3DEntrance (rotateX: 40, scale: 0.6)

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    rotateX: 25,
    scale: 0.85,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 14,
      stiffness: 120,
    },
  },
};

export function StaggerContainer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ perspective: 900, ...style }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div variants={itemVariants} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// TiltCard is now in ./TiltCard.tsx (mouse-tracking 3D tilt)


// ─── Pressable Scale ─────────────────────────────────────────────────────────
// Ported from PressableScale web branch

export function PressableScale({
  children,
  className,
  style,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { scale: 1.025, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={className}
      style={{
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : undefined,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── Page Transition ─────────────────────────────────────────────────────────

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 100, mass: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Ambient Orbs ────────────────────────────────────────────────────────────
// Ported from AmbientOrbs: floating blurred orbs for depth

interface OrbConfig {
  size: number;
  color: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  opacity: number;
  duration: number;
  delay?: number;
}

function Orb({ config }: { config: OrbConfig }) {
  const pos: CSSProperties = {
    position: "absolute",
    width: config.size,
    height: config.size,
    borderRadius: "50%",
    filter: `blur(${Math.max(60, config.size * 0.4)}px)`,
    pointerEvents: "none",
  };
  if (config.top) pos.top = config.top;
  if (config.bottom) pos.bottom = config.bottom;
  if (config.left) pos.left = config.left;
  if (config.right) pos.right = config.right;

  return (
    <motion.div
      style={{ ...pos, backgroundColor: config.color }}
      initial={{ opacity: config.opacity * 0.4, scale: 0.85 }}
      animate={{
        opacity: [config.opacity * 0.4, config.opacity, config.opacity * 0.4],
        scale: [0.85, 1.15, 0.85],
      }}
      transition={{
        duration: config.duration / 1000,
        delay: (config.delay || 0) / 1000,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

const HEADER_ORBS: OrbConfig[] = [
  { size: 220, color: "#1a7a8a", top: "-80px", left: "-60px", opacity: 0.25, duration: 7000, delay: 0 },
  { size: 180, color: "#C09D59", top: "20px", right: "-50px", opacity: 0.15, duration: 8000, delay: 1200 },
  { size: 140, color: "#2C3E50", bottom: "-40px", right: "30px", opacity: 0.2, duration: 6000, delay: 600 },
];

const LOGIN_ORBS: OrbConfig[] = [
  { size: 300, color: "#137386", top: "-120px", right: "-100px", opacity: 0.08, duration: 9000, delay: 0 },
  { size: 240, color: "#C09D59", bottom: "-80px", left: "-80px", opacity: 0.06, duration: 10000, delay: 1000 },
  { size: 160, color: "#8B5CF6", top: "40%", left: "10%", opacity: 0.04, duration: 7000, delay: 500 },
];

export function HeaderOrbs() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderBottomLeftRadius: "2.5rem",
        borderBottomRightRadius: "2.5rem",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {HEADER_ORBS.map((o, i) => (
        <Orb key={i} config={o} />
      ))}
    </div>
  );
}

export function LoginOrbs() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {LOGIN_ORBS.map((o, i) => (
        <Orb key={i} config={o} />
      ))}
    </div>
  );
}

// ─── Success Animation ───────────────────────────────────────────────────────
// Cinematic success screen with layered animations

export function SuccessAnimation({
  children,
  emoji = "✅",
}: {
  children: ReactNode;
  emoji?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      {/* Background pulse ring */}
      <div className="relative inline-flex items-center justify-center mb-8">
        <motion.div
          className="absolute w-36 h-36 rounded-full"
          style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1.2] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute w-28 h-28 rounded-full border-2"
          style={{ borderColor: "hsl(var(--success) / 0.3)" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 8, stiffness: 80, delay: 0.15 }}
        />
        <motion.div
          className="relative w-28 h-28 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "hsl(var(--success) / 0.1)" }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.1 }}
        >
          <motion.span
            className="text-5xl"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
          >
            {emoji}
          </motion.span>
        </motion.div>
      </div>

      {/* Content fades up */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", damping: 20, stiffness: 100 }}
      >
        {children}
      </motion.div>

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: ["#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#3B82F6", "#EF4444"][i % 6],
              left: `${10 + Math.random() * 80}%`,
              top: "50%",
            }}
            initial={{ opacity: 0, y: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -80 - Math.random() * 120],
              x: [0, (Math.random() - 0.5) * 100],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.2 + Math.random() * 0.5,
              delay: 0.4 + Math.random() * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Floating Emoji ──────────────────────────────────────────────────────────

export function FloatingEmoji({
  emoji,
  selected,
  onClick,
  label,
  color,
  disabled,
}: {
  emoji: string;
  selected: boolean;
  onClick: () => void;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      layout
      whileHover={disabled ? undefined : { scale: 1.08, y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      animate={
        selected
          ? { scale: 1.05, backgroundColor: color, color: "#fff" }
          : { scale: 1, backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }
      }
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="px-3 py-2 rounded-2xl flex items-center gap-1.5 font-bold text-sm"
      style={{
        border: selected ? "none" : "1px solid hsl(var(--border))",
        opacity: disabled && !selected ? 0.3 : 1,
        boxShadow: selected ? `0 6px 20px ${color}50` : "none",
      }}
    >
      <motion.span
        className="text-lg"
        animate={selected ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {emoji}
      </motion.span>
      {label}
    </motion.button>
  );
}

// ─── Breathing Circle ────────────────────────────────────────────────────────
// Cinematic breathing animation for timer/breathing blocks

export function BreathingCircle({
  running,
  isBreathing,
  children,
}: {
  running: boolean;
  isBreathing: boolean;
  children: ReactNode;
}) {
  const baseColor = isBreathing ? "#14B8A6" : "hsl(var(--primary))";

  return (
    <div className="relative inline-flex items-center justify-center mb-6">
      {/* Outer pulse ring */}
      {running && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            border: `2px solid ${baseColor}`,
            opacity: 0.3,
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.div
        className="w-44 h-44 rounded-full flex flex-col items-center justify-center"
        animate={
          running
            ? {
                scale: [1, 1.08, 1],
                boxShadow: [
                  `0 0 0 0 ${baseColor}00`,
                  `0 0 40px 10px ${baseColor}40`,
                  `0 0 0 0 ${baseColor}00`,
                ],
              }
            : { scale: 1 }
        }
        transition={running ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : {}}
        style={{
          backgroundColor: running ? baseColor : "hsl(var(--secondary))",
          border: running ? "none" : "10px solid hsl(var(--border))",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
