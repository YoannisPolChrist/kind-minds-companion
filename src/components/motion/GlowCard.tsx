/**
 * GlowCard — Card with animated glow border that follows mouse position
 */

import { motion, useMotionValue, useMotionTemplate } from "motion/react";
import { type ReactNode, type CSSProperties, useRef, useCallback } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  glowColor?: string;
}

export function GlowCard({ children, className, style, onClick, glowColor = "hsl(var(--primary))" }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}% ${mouseY}%, ${glowColor}15, transparent 70%)`;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(50);
    mouseY.set(50);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          background,
          pointerEvents: "none",
          borderRadius: "inherit",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}
