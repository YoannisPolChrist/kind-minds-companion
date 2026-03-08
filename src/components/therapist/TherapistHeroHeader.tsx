import { useMemo } from "react";
import { HeaderOrbs } from "../motion";
import { getRandomHeaderImage } from "../../constants/headerImages";

export default function TherapistHeroHeader({
  children,
  maxWidthClassName = "max-w-5xl",
}: {
  children: React.ReactNode;
  maxWidthClassName?: string;
}) {
  const headerImg = useMemo(() => getRandomHeaderImage(), []);

  return (
    <div className="bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-b-[2rem] relative overflow-hidden">
      <img
        src={headerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/30 to-primary/25" />
      <HeaderOrbs />

      <div className={`${maxWidthClassName} mx-auto px-6 pt-12 pb-8 relative z-10`}>
        {children}
      </div>
    </div>
  );
}
