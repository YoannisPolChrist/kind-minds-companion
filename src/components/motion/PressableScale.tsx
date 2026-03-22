import type { CSSProperties, ReactNode } from "react";

export default function PressableScale({
  children,
  className,
  style,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        className,
        disabled ? "pointer-events-none" : "",
        "transition-transform duration-200 ease-out",
        !disabled && onClick ? "hover:-translate-y-0.5 hover:scale-[1.025] active:translate-y-0 active:scale-[0.97]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : undefined,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
