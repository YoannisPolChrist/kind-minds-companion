import { motion } from "motion/react";
import { type ReactNode, type CSSProperties } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  glowColor?: string;
}

export function GlowCard({ children, className, style, onClick }: GlowCardProps) {
  return (
    <motion.div
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onClick={onClick}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
