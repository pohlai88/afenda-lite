import { cn } from "@/lib/utils";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  formatPortalEditorialHeading,
  PORTAL_EDITORIAL_HEADING,
  resolveSharpEditorialCopy,
  resolveSharpEditorialHeading,
  type PortalEditorialCopy,
  type PortalEditorialVariant,
} from "./contracts/portal-editorial.contract";
import { isPortalHeroWordInverted } from "./contracts/portal-editorial-inversion.contract";
import type { PortalAtmosphereTheme } from "./contracts/portal-theme.contract";
import { PortalHeroConnector } from "./PortalHeroConnector";
import { PortalHeroWord } from "./PortalHeroWord";

export interface PortalEditorialHeroProps {
  readonly theme: PortalAtmosphereTheme;
  readonly copy?: PortalEditorialCopy;
  readonly variant?: PortalEditorialVariant;
  /** PA-P10 Pattern B — disable atmosphere sr-only h1 when the auth route owns the page heading. */
  readonly suppressPageHeading?: boolean;
  readonly className?: string;
}

function resolveEditorialHeading(copy: PortalEditorialCopy): string {
  if (
    copy.truth === DEFAULT_PORTAL_EDITORIAL_COPY.truth &&
    copy.connector === DEFAULT_PORTAL_EDITORIAL_COPY.connector &&
    copy.protected === DEFAULT_PORTAL_EDITORIAL_COPY.protected
  ) {
    return PORTAL_EDITORIAL_HEADING;
  }

  return formatPortalEditorialHeading(copy);
}

/**
 * Portal editorial hero.
 *
 * PA-P4 doctrine:
 * - Owns poster typography only.
 * - Owns semantic sr-only h1 unless suppressed for PA-P10.
 * - Owns visual inversion rule via `portal-editorial-inversion.contract`.
 */
export function PortalEditorialHero({
  theme,
  copy = DEFAULT_PORTAL_EDITORIAL_COPY,
  variant = "classic",
  suppressPageHeading = false,
  className,
}: PortalEditorialHeroProps) {
  if (variant === "sharp") {
    const sharpCopy = resolveSharpEditorialCopy(theme);

    return (
      <>
        {!suppressPageHeading ? (
          <h1 className="sr-only">{resolveSharpEditorialHeading(theme)}</h1>
        ) : null}

        <div
          className={cn("portal-editorial-hero portal-editorial-hero--sharp", className)}
          aria-hidden="true"
          data-portal-editorial-hero=""
          data-portal-editorial-variant="sharp"
          data-portal-hero-theme={theme}
        >
          <p className="portal-hero-headline">{sharpCopy.headline}</p>
          <span className="portal-hero-divider" aria-hidden="true">
            <span className="portal-hero-divider__line" />
            <span className="portal-hero-divider__gem">◆</span>
            <span className="portal-hero-divider__line" />
          </span>
          <p className="portal-hero-subtitle">{sharpCopy.subtitle}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {!suppressPageHeading ? (
        <h1 className="sr-only">{resolveEditorialHeading(copy)}</h1>
      ) : null}

      <div
        className={cn("portal-editorial-hero", className)}
        aria-hidden="true"
        data-portal-editorial-hero=""
        data-portal-editorial-variant="classic"
        data-portal-hero-theme={theme}
      >
        <PortalHeroWord
          tone="truth"
          inverted={isPortalHeroWordInverted(theme, "truth")}
        >
          {copy.truth}
        </PortalHeroWord>

        <PortalHeroConnector>{copy.connector}</PortalHeroConnector>

        <PortalHeroWord
          tone="protected"
          inverted={isPortalHeroWordInverted(theme, "protected")}
        >
          {copy.protected}
        </PortalHeroWord>
      </div>
    </>
  );
}
