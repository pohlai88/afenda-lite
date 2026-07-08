import type { ReactNode } from "react";
import type { PortalHeroWordRole } from "./contracts/portal-editorial-inversion.contract";
import { cn } from "@/lib/utils";

export interface PortalHeroWordProps {
  readonly children: ReactNode;
  readonly tone: PortalHeroWordRole;
  readonly inverted?: boolean;
  readonly className?: string;
}

/**
 * Visual-only editorial word.
 *
 * Accessibility is owned by PortalEditorialHero's sr-only heading.
 */
export function PortalHeroWord({
  children,
  tone,
  inverted = false,
  className,
}: PortalHeroWordProps) {
  return (
    <span
      className={cn(
        "portal-hero-word",
        `portal-hero-word--${tone}`,
        inverted && "portal-hero-word--inverted",
        className,
      )}
      data-portal-hero-word={tone}
      data-portal-hero-inverted={inverted ? "true" : "false"}
    >
      {children}
    </span>
  );
}
