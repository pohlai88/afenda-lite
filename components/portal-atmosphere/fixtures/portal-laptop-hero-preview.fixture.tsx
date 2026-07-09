import { AccessVaultPlaceholder } from "./access-vault-placeholder";
import { PortalAccessSlot } from "../PortalAccessSlot";
import { PortalAtmosphere } from "../PortalAtmosphere";
import { PortalCelestialDeco } from "../PortalCelestialDeco";
import { PortalCompLaptopOwl } from "../PortalCompLaptopOwl";
import { PortalEditorialHero } from "../PortalEditorialHero";
import { PortalSealLine } from "../PortalSealLine";
import type { PortalAtmosphereTheme } from "../contracts/portal-theme.contract";

export interface PortalLaptopHeroPreviewProps {
  readonly theme: PortalAtmosphereTheme;
}

/**
 * Comp-aligned laptop hero fixture (Storybook only).
 *
 * Composes production PortalAtmosphere with scoped `--comp-laptop` modifier,
 * removebg owl base units + CSS celestial/marble deco, classic editorial, vault placeholder.
 * No Neon Auth or server imports.
 */
export function PortalLaptopHeroPreview({ theme }: PortalLaptopHeroPreviewProps) {
  return (
    <PortalAtmosphere
      className="portal-atmosphere--comp-laptop"
      theme={theme}
      layers={
        <>
          <PortalCelestialDeco />
          <PortalCompLaptopOwl showOwl theme={theme} />
        </>
      }
      brand={
        <>
          <PortalEditorialHero theme={theme} variant="classic" />
          <PortalSealLine showSeal />
        </>
      }
      accessSlot={
        <PortalAccessSlot>
          <AccessVaultPlaceholder />
        </PortalAccessSlot>
      }
    />
  );
}
