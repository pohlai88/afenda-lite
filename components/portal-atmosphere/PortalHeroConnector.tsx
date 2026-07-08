import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PortalHeroConnectorProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Visual-only connector between editorial words.
 *
 * Semantic meaning is provided by the sr-only heading in PortalEditorialHero.
 */
export function PortalHeroConnector({
  children,
  className,
}: PortalHeroConnectorProps) {
  return (
    <span
      className={cn("portal-hero-connector", className)}
      data-portal-hero-connector=""
    >
      <span className="portal-hero-connector__rule" aria-hidden="true" />
      <span className="portal-hero-connector__text">{children}</span>
      <span className="portal-hero-connector__rule" aria-hidden="true" />
    </span>
  );
}
