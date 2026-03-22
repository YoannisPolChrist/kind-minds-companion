/**
 * Skeleton loading placeholders
 * Ported from components/ui/Skeleton.tsx (native)
 */

import { motion } from "motion/react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

export function Skeleton({ className = "", width, height, rounded = "rounded-2xl" }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-muted ${rounded} ${className}`}
      style={{ width, height }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Card-shaped skeleton */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card rounded-3xl border border-border p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/** Row of metric skeleton cards */
export function SkeletonMetrics({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/10 rounded-2xl p-4 space-y-2">
          <Skeleton className="h-3 w-8 mx-auto" rounded="rounded" />
          <Skeleton className="h-7 w-12 mx-auto" rounded="rounded-lg" />
          <Skeleton className="h-2 w-16 mx-auto" rounded="rounded" />
        </div>
      ))}
    </div>
  );
}

/** Template/exercise card skeleton */
export function SkeletonTemplateGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-3xl border border-border p-7 space-y-4">
          <Skeleton className="w-14 h-14" rounded="rounded-2xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/3" rounded="rounded-xl" />
          <div className="flex gap-3 pt-4 border-t border-border">
            <Skeleton className="flex-1 h-12" rounded="rounded-2xl" />
            <Skeleton className="flex-1 h-12" rounded="rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
