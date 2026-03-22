import type { ReactNode } from "react";

export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        animation: "km-page-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [style*="km-page-enter"] {
            animation: none !important;
          }
        }

        @keyframes km-page-enter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {children}
    </div>
  );
}
