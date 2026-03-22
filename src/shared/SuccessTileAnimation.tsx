import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Standalone success animation used for saved tiles / cards.
 * Copy this file into other projects when you want the same look & feel.
 */
export default function SuccessTileAnimation({
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
      className="relative text-center"
    >
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", damping: 20, stiffness: 100 }}
      >
        {children}
      </motion.div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, idx) => (
          <motion.div
            key={idx}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: ["#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#3B82F6", "#EF4444"][idx % 6],
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
