/**
 * ParallaxSection — Scroll-driven parallax with focus-based opacity
 * Ported from CinematicInfoBlock.
 */

import { motion, useScroll, useTransform } from "motion/react";
import { type ReactNode, type CSSProperties, useRef } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  speed?: number;
  fadeIn?: boolean;
}

export function ParallaxSection({
  children,
  className,
  style,
  speed = 0.15,
  fadeIn = true,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [60 * speed, -60 * speed]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, ...(fadeIn ? { opacity } : {}), ...style }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingOrb({
  color,
  size,
  position,
  speed = 0.3,
}: {
  color: string;
  size: number;
  position: CSSProperties;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);

  return (
    <motion.div
      ref={ref}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        filter: `blur(${Math.max(60, size * 0.4)}px)`,
        pointerEvents: "none",
        y,
        ...position,
      }}
    />
  );
}
