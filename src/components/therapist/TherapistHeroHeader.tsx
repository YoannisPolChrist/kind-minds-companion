import type { ReactNode } from "react";
import { HeaderOrbs } from "../motion";

const HERO_IMAGES = [
  "/images/nature-header-1.webp",
  "/images/nature-header-2.webp",
  "/images/nature-header-3.webp",
  "/images/nature-header-4.webp",
] as const;

type TherapistHeroHeaderProps = {
  children: ReactNode;
  maxWidthClassName?: string;
  backgroundImage?: string;
  imageIndex?: number;
};

export default function TherapistHeroHeader({
  children,
  maxWidthClassName = "max-w-6xl",
  backgroundImage,
  imageIndex = 0,
}: TherapistHeroHeaderProps) {
  const resolvedImage =
    backgroundImage ??
    HERO_IMAGES[((imageIndex % HERO_IMAGES.length) + HERO_IMAGES.length) % HERO_IMAGES.length];

  return (
    <div className="relative overflow-hidden rounded-b-[2rem] border-b border-border text-primary-foreground">
      <img
        src={resolvedImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover brightness-110"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-slate-900/25 to-slate-950/60 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/18 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px] opacity-12" />
      <div className="absolute inset-y-0 right-0 w-1/2 max-w-[720px] bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.3),_transparent_60%)] opacity-60 mix-blend-screen" />
      <HeaderOrbs />

      <div className={`${maxWidthClassName} mx-auto px-6 pt-12 pb-8 relative z-10`}>
        {children}
      </div>
    </div>
  );
}
