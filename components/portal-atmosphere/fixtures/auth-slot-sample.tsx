import type { ReactNode } from "react";
import type { PortalAtmosphereTheme } from "../contracts/portal-theme.contract";
import { PortalAtmospherePreview } from "./portal-atmosphere-preview.fixture";

export interface PortalAuthSlotSampleProps {
  readonly theme: PortalAtmosphereTheme;
  readonly children: ReactNode;
  readonly suppressPageHeading?: boolean;
}

/**
 * PA-P10 sample — inject access-slot children through PA-P7 fixture authority.
 *
 * Does not import Neon Auth, AuthView, session providers, or server actions.
 * Real auth wiring belongs in `portal-auth-layout.tsx` (follow-up PR).
 */
export function PortalAuthSlotSample({
  theme,
  children,
  suppressPageHeading = false,
}: PortalAuthSlotSampleProps) {
  return (
    <PortalAtmospherePreview
      theme={theme}
      suppressPageHeading={suppressPageHeading}
      accessSlot={children}
    />
  );
}
