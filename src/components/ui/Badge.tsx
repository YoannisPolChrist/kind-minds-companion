/**
 * Badge component
 * Ported from components/ui/Badge.tsx (native)
 */

import type { ReactNode } from "react";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger" | "muted";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-primary/10 border-primary/20 text-primary",
  secondary: "bg-accent/10 border-accent/20 text-accent",
  success: "bg-success/10 border-success/20 text-success",
  warning: "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#B45309]",
  danger: "bg-destructive/10 border-destructive/20 text-destructive",
  muted: "bg-muted border-border text-muted-foreground",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-extrabold uppercase tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
