import { PortalAtmosphere } from "../PortalAtmosphere";
import { PortalGuardianOwl } from "../PortalGuardianOwl";
import type { PortalAtmosphereTheme } from "../contracts/portal-theme.contract";

export interface PortalGuardianOwlPreviewProps {
  readonly theme?: PortalAtmosphereTheme;
}

/** PA-P3 isolated review — owl + PA-P2 background only. No hero, seal, or auth. */
export function PortalGuardianOwlPreview({
  theme = "dark",
}: PortalGuardianOwlPreviewProps) {
  return (
    <PortalAtmosphere theme={theme} layers={<PortalGuardianOwl />}>
      <div className="grid min-h-svh place-items-center font-[family-name:var(--font-ui)] text-[color:var(--portal-fg)]">
        <div className="rounded-2xl border border-[color:var(--portal-border)] bg-[color-mix(in_oklch,var(--portal-bg)_72%,transparent)] px-5 py-4 text-sm text-[color:var(--portal-muted)]">
          PA-P3 guardian owl layer only
        </div>
      </div>
    </PortalAtmosphere>
  );
}
