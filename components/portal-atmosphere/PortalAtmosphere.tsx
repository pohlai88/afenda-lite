import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PortalBackgroundLayers } from "./PortalBackgroundLayers";
import { resolvePortalThemeSurfaceFromTheme } from "./contracts/portal-atmosphere.contract";
import {
  DEFAULT_PORTAL_THEME_SELECTION,
  type PortalAtmosphereTheme,
} from "./contracts/portal-theme.contract";

export interface PortalAtmosphereProps {
  readonly children?: ReactNode;
  readonly theme?: PortalAtmosphereTheme;
  readonly withBackgroundLayers?: boolean;
  /** PA-P3+ atmosphere layers (owl) rendered below the z-10 content slot. */
  readonly layers?: ReactNode;
  readonly className?: string;
  /** PA-P8 layout slots — mobile order: header → access → brand. */
  readonly header?: ReactNode;
  readonly brand?: ReactNode;
  readonly accessSlot?: ReactNode;
}

/**
 * Portal Atmosphere root shell.
 *
 * PA-P2: isolated full-viewport canvas with optional background layers.
 * PA-P8: header / accessSlot / brand compose the responsive grid.
 * Empty slots are omitted so mobile grid areas do not reserve ghost rows.
 *
 * Invariant: when any layout slot is set, `children` is ignored — poster
 * content belongs in `brand` / `accessSlot` / `header`, not as unslotted siblings.
 */
export function PortalAtmosphere({
  children,
  theme = DEFAULT_PORTAL_THEME_SELECTION.theme,
  withBackgroundLayers = true,
  layers,
  className,
  header,
  brand,
  accessSlot,
}: PortalAtmosphereProps) {
  const { className: themeClassName, ...themeAttributes } =
    resolvePortalThemeSurfaceFromTheme(theme);

  const hasHeader = header != null;
  const hasAccess = accessSlot != null;
  const hasBrand = brand != null;
  const useLayoutGrid = hasHeader || hasAccess || hasBrand;

  return (
    <div
      className={cn("portal-atmosphere", themeClassName, className)}
      {...themeAttributes}
    >
      {withBackgroundLayers ? <PortalBackgroundLayers /> : null}
      {layers}
      {useLayoutGrid ? (
        <div
          className="portal-atmosphere__layout"
          data-portal-layout-header={hasHeader ? "true" : undefined}
          data-portal-layout-access={hasAccess ? "true" : undefined}
          data-portal-layout-brand={hasBrand ? "true" : undefined}
        >
          {hasHeader ? (
            <header className="portal-atmosphere__header">{header}</header>
          ) : null}
          {hasAccess ? (
            <div className="portal-atmosphere__access">{accessSlot}</div>
          ) : null}
          {hasBrand ? (
            <section className="portal-atmosphere__brand">{brand}</section>
          ) : null}
        </div>
      ) : (
        <div className="portal-atmosphere__content">{children}</div>
      )}
    </div>
  );
}
