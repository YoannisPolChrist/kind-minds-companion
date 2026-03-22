import { motion } from "motion/react";

export default function FloatingEmoji({
  emoji,
  selected,
  onClick,
  label,
  color,
  disabled,
}: {
  emoji: string;
  selected: boolean;
  onClick: () => void;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      layout
      whileHover={disabled ? undefined : { scale: 1.08, y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      animate={
        selected
          ? { scale: 1.05, backgroundColor: color, color: "#fff" }
          : { scale: 1, backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }
      }
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="px-3 py-2 rounded-2xl flex items-center gap-1.5 font-bold text-sm"
      style={{
        border: selected ? "none" : "1px solid hsl(var(--border))",
        opacity: disabled && !selected ? 0.3 : 1,
        boxShadow: selected ? `0 6px 20px ${color}50` : "none",
      }}
    >
      <motion.span
        className="text-lg"
        animate={selected ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {emoji}
      </motion.span>
      {label}
    </motion.button>
  );
}
