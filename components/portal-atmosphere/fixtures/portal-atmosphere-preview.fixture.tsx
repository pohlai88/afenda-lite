import type { ReactNode } from "react";
import { AccessSlotPlaceholder } from "./access-slot-placeholder";
import { PortalAccessSlot } from "../PortalAccessSlot";
import { PortalAtmosphere } from "../PortalAtmosphere";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  resolveSharpEditorialCopy,
  type PortalEditorialCopy,
} from "../contracts/portal-editorial.contract";
import { PortalEditorialHero } from "../PortalEditorialHero";
import { PortalGuardianOwl } from "../PortalGuardianOwl";
import { PortalSealLine } from "../PortalSealLine";
import type { PortalAtmosphereTheme } from "../contracts/portal-theme.contract";

const DEFAULT_ACCESS_SLOT = <AccessSlotPlaceholder />;

export interface PortalAtmospherePreviewProps {
  readonly theme?: PortalAtmosphereTheme;
  readonly showSeal?: boolean;
  readonly showOwl?: boolean;
  readonly showAccessSlot?: boolean;
  readonly owlPreset?: "dramatic" | "sharp";
  readonly editorialVariant?: "classic" | "sharp";
  /** PA-P10 Pattern B — route owns visible h1 when true. */
  readonly suppressPageHeading?: boolean;
  readonly accessSlot?: ReactNode;
}

/**
 * Canonical full atmosphere composition for design review (PA-P7) and PA-P10 wiring.
 *
 * Fixture authority:
 * - Renders production `PortalAtmosphere` with PA-P8 layout slots.
 * - Owl stays in the `layers` slot (decorative background).
 * - Editorial hero and seal compose the `brand` slot.
 * - Access chamber uses `PortalAccessSlot` with inert placeholder by default.
 * - Does not import Neon Auth, AuthView, session providers, or server actions.
 */
export function PortalAtmospherePreview({
  theme = "dark",
  showSeal = true,
  showOwl = true,
  showAccessSlot = true,
  owlPreset = "sharp",
  editorialVariant = "sharp",
  suppressPageHeading = false,
  accessSlot = DEFAULT_ACCESS_SLOT,
}: PortalAtmospherePreviewProps) {
  const sharpCopy =
    editorialVariant === "sharp" ? resolveSharpEditorialCopy(theme) : null;
  const editorialCopy: PortalEditorialCopy = sharpCopy
    ? {
        ...DEFAULT_PORTAL_EDITORIAL_COPY,
        ...(sharpCopy.seal !== undefined ? { seal: sharpCopy.seal } : {}),
      }
    : DEFAULT_PORTAL_EDITORIAL_COPY;

  return (
    <PortalAtmosphere
      theme={theme}
      layers={<PortalGuardianOwl preset={owlPreset} showOwl={showOwl} />}
      brand={
        <>
          <PortalEditorialHero
            theme={theme}
            copy={editorialCopy}
            variant={editorialVariant}
            suppressPageHeading={suppressPageHeading}
          />
          <PortalSealLine copy={editorialCopy} showSeal={showSeal} />
        </>
      }
      accessSlot={
        showAccessSlot ? (
          <PortalAccessSlot>{accessSlot}</PortalAccessSlot>
        ) : undefined
      }
    />
  );
}

export interface PortalAtmosphereSplitPreviewProps {
  readonly showSeal?: boolean;
  readonly showAccessSlot?: boolean;
  readonly showOwl?: boolean;
}

/** Side-by-side dark/light review surface for inversion sign-off. */
export function PortalAtmosphereSplitPreview({
  showSeal = true,
  showAccessSlot = true,
  showOwl = true,
}: PortalAtmosphereSplitPreviewProps = {}) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
      <div className="relative min-h-svh">
        <PortalAtmospherePreview
          theme="dark"
          showSeal={showSeal}
          showAccessSlot={showAccessSlot}
          showOwl={showOwl}
        />
      </div>
      <div className="relative min-h-svh">
        <PortalAtmospherePreview
          theme="light"
          showSeal={showSeal}
          showAccessSlot={showAccessSlot}
          showOwl={showOwl}
        />
      </div>
    </div>
  );
}
