/**
 * ConfirmModal
 * Ported from components/ui/ConfirmModal.tsx (native)
 * Spring-animated modal with destructive/default variants, loading state
 */

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, HelpCircle, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: ReactNode;
}

export function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Bestätigen",
  cancelText = "Abbrechen",
  isDestructive = false,
  icon,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const themeColor = isDestructive ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const themeBg = isDestructive ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--primary) / 0.1)";
  const themeBorder = isDestructive ? "hsl(var(--destructive) / 0.2)" : "hsl(var(--primary) / 0.2)";

  const DefaultIcon = isDestructive ? Trash2 : HelpCircle;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={loading ? undefined : onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-card rounded-[2rem] border border-border p-8 shadow-2xl max-w-[360px] w-[85%] text-center"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center border"
              style={{ backgroundColor: themeBg, borderColor: themeBorder }}
            >
              {icon || <DefaultIcon size={32} style={{ color: themeColor }} />}
            </div>

            <h2 className="text-[22px] font-black text-foreground mb-3 tracking-tight leading-tight">
              {title}
            </h2>
            <p className="text-base font-medium text-muted-foreground leading-relaxed mb-8">
              {message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <motion.button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-4 rounded-[1.25rem] bg-secondary text-foreground font-bold text-base disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-4 rounded-[1.25rem] text-white font-extrabold text-base disabled:opacity-50 flex items-center justify-center"
                style={{
                  backgroundColor: themeColor,
                  boxShadow: `0 8px 24px -4px ${themeColor}40`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {loading ? (
                  <motion.span
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  confirmText
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
