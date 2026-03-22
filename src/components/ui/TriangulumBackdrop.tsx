import type { CSSProperties } from "react";
import { motion } from "motion/react";

type TriangleConfig = {
  size: number;
  color: string;
  opacity: number;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  rotate: string;
  delay?: number;
  duration?: number;
};

const LIGHT_TRIANGLES: TriangleConfig[] = [
  { size: 120, color: "rgba(192, 157, 89, 0.9)", opacity: 0.12, top: -12, left: "8%", rotate: "-12deg", delay: 0 },
  { size: 160, color: "rgba(19, 115, 134, 0.95)", opacity: 0.1, bottom: -52, right: "7%", rotate: "18deg", delay: 600 },
  { size: 90, color: "rgba(88, 194, 210, 0.92)", opacity: 0.12, top: 72, right: "24%", rotate: "32deg", delay: 350 },
];

function Triangle({ config }: { config: TriangleConfig }) {
  const style: CSSProperties = {
    position: "absolute",
    width: config.size,
    height: config.size * 1.1,
    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    background: config.color,
    opacity: config.opacity,
    transform: `rotate(${config.rotate})`,
    filter: "blur(0.2px)",
  };

  if (config.top !== undefined) style.top = config.top;
  if (config.bottom !== undefined) style.bottom = config.bottom;
  if (config.left !== undefined) style.left = config.left;
  if (config.right !== undefined) style.right = config.right;

  return (
    <motion.div
      style={style}
      initial={{ opacity: config.opacity * 0.4, y: -8 }}
      animate={{ opacity: config.opacity, y: 8 }}
      transition={{
        duration: (config.duration ?? 5200) / 1000,
        delay: (config.delay ?? 0) / 1000,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    />
  );
}

export default function TriangulumBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {LIGHT_TRIANGLES.map((triangle, index) => (
        <Triangle key={`triangle-${index}`} config={triangle} />
      ))}
    </div>
  );
}
