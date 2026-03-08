import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function CountUp({ to, duration = 1.2, className, suffix = "", prefix = "" }: CountUpProps) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const next = Math.round(from + (to - from) * progress);
      setValue(next);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [to, duration]);

  return <span className={className}>{prefix}{value}{suffix}</span>;
}
