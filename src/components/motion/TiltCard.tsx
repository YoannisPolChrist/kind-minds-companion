import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

export default function TiltCard({
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
