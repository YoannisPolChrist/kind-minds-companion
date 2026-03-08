/**
 * CountUp — Animated number counter
 * Springs from 0 to target value with configurable duration.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function CountUp({ to, duration = 1.2, className, suffix = "", prefix = "" }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { 
    stiffness: 60, 
    damping: 20,
    duration: duration * 1000,
  });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    motionValue.set(to);
  }, [to, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (v) => {
      setDisplay(Math.round(v).toString());
    });
    return unsubscribe;
  }, [springValue]);

  return (
    <motion.span className={className}>
      {prefix}{display}{suffix}
    </motion.span>
  );
}
