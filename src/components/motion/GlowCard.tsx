import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

export default function GlowCard({
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
