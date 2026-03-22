import type { CSSProperties } from "react";

interface OrbConfig {
  size: number;
  color: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  opacity: number;
  duration: number;
  delay?: number;
}

function Orb({ config }: { config: OrbConfig }) {
  const pos: CSSProperties = {
    position: "absolute",
    width: config.size,
    height: config.size,
    borderRadius: "50%",
    filter: `blur(${Math.max(60, config.size * 0.4)}px)`,
    pointerEvents: "none",
    animationName: "km-orb-float",
    animationDuration: `${config.duration}ms`,
    animationDelay: `${config.delay || 0}ms`,
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
    opacity: config.opacity * 0.75,
  };
  if (config.top) pos.top = config.top;
  if (config.bottom) pos.bottom = config.bottom;
  if (config.left) pos.left = config.left;
  if (config.right) pos.right = config.right;

  return (
    <div style={{ ...pos, backgroundColor: config.color }} />
  );
}

const HEADER_ORBS: OrbConfig[] = [
  { size: 220, color: "#1a7a8a", top: "-80px", left: "-60px", opacity: 0.25, duration: 7000, delay: 0 },
  { size: 180, color: "#C09D59", top: "20px", right: "-50px", opacity: 0.15, duration: 8000, delay: 1200 },
  { size: 140, color: "#2C3E50", bottom: "-40px", right: "30px", opacity: 0.2, duration: 6000, delay: 600 },
];

const LOGIN_ORBS: OrbConfig[] = [
  { size: 300, color: "#137386", top: "-120px", right: "-100px", opacity: 0.08, duration: 9000, delay: 0 },
  { size: 240, color: "#C09D59", bottom: "-80px", left: "-80px", opacity: 0.06, duration: 10000, delay: 1000 },
  { size: 160, color: "#8B5CF6", top: "40%", left: "10%", opacity: 0.04, duration: 7000, delay: 500 },
];

export function HeaderOrbs() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderBottomLeftRadius: "2.5rem",
        borderBottomRightRadius: "2.5rem",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [style*="km-orb-float"] {
            animation: none !important;
          }
        }

        @keyframes km-orb-float {
          0% {
            opacity: 0.35;
            transform: scale(0.88);
          }

          50% {
            opacity: 1;
            transform: scale(1.12);
          }

          100% {
            opacity: 0.35;
            transform: scale(0.88);
          }
        }
      `}</style>
      {HEADER_ORBS.map((cfg, idx) => (
        <Orb key={idx} config={cfg} />
      ))}
    </div>
  );
}

export function LoginOrbs() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [style*="km-orb-float"] {
            animation: none !important;
          }
        }

        @keyframes km-orb-float {
          0% {
            opacity: 0.35;
            transform: scale(0.88);
          }

          50% {
            opacity: 1;
            transform: scale(1.12);
          }

          100% {
            opacity: 0.35;
            transform: scale(0.88);
          }
        }
      `}</style>
      {LOGIN_ORBS.map((cfg, idx) => (
        <Orb key={idx} config={cfg} />
      ))}
    </div>
  );
}
