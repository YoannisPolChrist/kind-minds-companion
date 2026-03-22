/**
 * Toast / SuccessAnimation overlay
 * Ported from components/ui/SuccessAnimation.tsx (native)
 * Full-screen modal with auto-dismiss, spring animations, icon variants
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  subMessage?: string;
  type?: ToastType;
  onDone?: () => void;
  /** ms before auto-dismiss. 0 = no auto-dismiss */
  duration?: number;
}

const config: Record<ToastType, {
  icon: typeof CheckCircle;
  color: string;
  bg: string;
  ring: string;
}> = {
  success: { icon: CheckCircle, color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.1)", ring: "hsl(var(--success) / 0.2)" },
  error: { icon: XCircle, color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)", ring: "hsl(var(--destructive) / 0.2)" },
  warning: { icon: AlertTriangle, color: "#F59E0B", bg: "rgba(245,158,11,0.1)", ring: "rgba(245,158,11,0.2)" },
  info: { icon: Info, color: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.1)", ring: "hsl(var(--primary) / 0.2)" },
};

export function Toast({ visible, message, subMessage, type = "success", onDone, duration }: ToastProps) {
  const autoDuration = duration ?? (type === "error" ? 3000 : 1800);

  useEffect(() => {
    if (visible && onDone && autoDuration > 0) {
      const t = setTimeout(onDone, autoDuration);
      return () => clearTimeout(t);
    }
  }, [visible, onDone, autoDuration]);

  const cfg = config[type];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-card/85 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            className="relative bg-card rounded-[2.5rem] border border-border p-8 shadow-2xl max-w-[360px] w-[85%] text-center"
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            style={{ boxShadow: `0 24px 60px -12px ${cfg.color}30` }}
          >
            {/* Icon circle */}
            <motion.div
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.ring}` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
              >
                <Icon size={40} style={{ color: cfg.color }} strokeWidth={2.5} />
              </motion.div>
            </motion.div>

            {/* Message */}
            <motion.h2
              className="text-[22px] font-black text-foreground mb-2 tracking-tight"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {message}
            </motion.h2>
            {subMessage && (
              <motion.p
                className="text-[15px] font-medium text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {subMessage}
              </motion.p>
            )}

            {/* Confetti for success */}
            {type === "success" && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ["#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"][i % 5],
                      left: `${10 + Math.random() * 80}%`,
                      top: "40%",
                    }}
                    initial={{ opacity: 0, y: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: [0, -60 - Math.random() * 80],
                      x: [0, (Math.random() - 0.5) * 80],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 1 + Math.random() * 0.4,
                      delay: 0.3 + Math.random() * 0.3,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Inline Banner Toast (non-blocking) ── */

interface BannerToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDone?: () => void;
  duration?: number;
}

export function BannerToast({ visible, message, type = "success", onDone, duration = 3000 }: BannerToastProps) {
  useEffect(() => {
    if (visible && onDone && duration > 0) {
      const t = setTimeout(onDone, duration);
      return () => clearTimeout(t);
    }
  }, [visible, onDone, duration]);

  const cfg = config[type];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-6 left-1/2 z-[9999] -translate-x-1/2"
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 250 }}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl px-5 py-3.5 flex items-center gap-3 min-w-[280px]"
            style={{ boxShadow: `0 12px 40px -8px ${cfg.color}30` }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
              <Icon size={18} style={{ color: cfg.color }} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-foreground">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
