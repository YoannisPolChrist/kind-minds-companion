import { useEffect, useState } from "react";

export default function CountUp({
  to,
  duration = 1.2,
  className,
  suffix = "",
  prefix = "",
}: {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setValue(Math.round(to * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration]);

  return <span className={className}>{prefix}{value}{suffix}</span>;
}
