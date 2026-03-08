/**
 * TiltCard — Mouse-tracking 3D tilt effect
 * Ported from Block3DTiltWrapper: tracks actual mouse position for realistic 3D perspective tilt.
 * Falls back to simple hover tilt on touch devices.
 */

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { type ReactNode, type CSSProperties, useRef, useCallback } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  maxTilt?: number;
}

const SPRING_CONFIG = { stiffness: 200, damping: 14, mass: 0.7 };

export function TiltCard({ children, className, style, onClick, maxTilt = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]), SPRING_CONFIG);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]), SPRING_CONFIG);
  const scale = useSpring(1, SPRING_CONFIG);
  const brightness = useTransform(mouseY, [0, 1], [1.04, 0.98]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    scale.set(1.02);
  }, [scale]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    scale.set(1);
  }, [mouseX, mouseY, scale]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        perspective: 900,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
        scale,
        filter: useTransform(brightness, (v) => `brightness(${v})`),
        ...style,
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.div>
  );
}
