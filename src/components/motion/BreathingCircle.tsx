import { motion } from "motion/react";
import type { ReactNode } from "react";

export default function BreathingCircle({
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
      {running && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: 200, height: 200, border: `2px solid ${baseColor}`, opacity: 0.3 }}
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
