import { PORTAL_NAME } from "@/lib/copy/portal-copy";
import { PortalAtmosphere } from "../PortalAtmosphere";
import { PortalDualGuardianDeco } from "../PortalDualGuardianDeco";
import { PortalDualGuardianOwls } from "../PortalDualGuardianOwls";
import { PortalSealLine } from "../PortalSealLine";
import {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  PORTAL_EDITORIAL_HEADING,
} from "../contracts/portal-editorial.contract";
import { AccessVaultThreshold } from "./access-vault-threshold";

/**
 * Dual Guardian Facade (Storybook design-review fixture only).
 *
 * Original cinematic concept — one full-screen poster, not the PA-P8
 * header/brand/access grid and not a stacked top/bottom layout. The dark
 * owl emerges from the left shadow, the white owl emerges from the right
 * light; both are ghosted into the background. The Access Vault sits
 * center-right, integrated into a glowing shield/keyhole threshold, framed
 * by celestial gold rings and a subtle marble wash over deep navy shadow
 * and pale ivory light.
 *
 * This facade is intentionally theme-invariant (both owls, both tones,
 * always present together as a single duality artwork) — it does not
 * accept a `theme` prop. No Neon Auth or server imports; no prod wiring
 * without explicit user sign-off (see pa-rejected-approaches.md).
 */
export function PortalDualGuardianFacade() {
  return (
    <PortalAtmosphere
      className="portal-atmosphere--dual-guardian"
      theme="dark"
      withBackgroundLayers={false}
      layers={
        <>
          <PortalDualGuardianDeco />
          <PortalDualGuardianOwls />
        </>
      }
    >
      <div
        className="portal-dual-guardian-facade"
        data-portal-dual-guardian-facade=""
      >
        <h1 className="sr-only">{PORTAL_EDITORIAL_HEADING}</h1>

        <header
          aria-hidden="true"
          className="portal-dual-guardian-facade__brandmark"
        >
          <p className="portal-dual-guardian-facade__eyebrow">{PORTAL_NAME}</p>
          <p className="portal-dual-guardian-facade__lockup">
            <span className="portal-dual-guardian-facade__word">
              {DEFAULT_PORTAL_EDITORIAL_COPY.truth}
            </span>
            <span className="portal-dual-guardian-facade__connector">
              {DEFAULT_PORTAL_EDITORIAL_COPY.connector}
            </span>
            <span className="portal-dual-guardian-facade__word">
              {DEFAULT_PORTAL_EDITORIAL_COPY.protected}
            </span>
          </p>
        </header>

        <AccessVaultThreshold />

        <PortalSealLine className="portal-dual-guardian-facade__seal" />
      </div>
    </PortalAtmosphere>
  );
}
