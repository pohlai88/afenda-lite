import Image from "next/image";
import {
  BRAND_DUAL_GUARDIAN_OWL_DARK_PATH,
  BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH,
} from "@/lib/copy/portal-brand";

/**
 * Dual Guardian Facade — night (dark, left) and light (white, right) owls
 * rendered together as one cinematic poster, not swapped per theme.
 *
 * Base units are the curated removebg PNGs in `owl-variants/allowed-base/`;
 * all atmosphere (ghosting into shadow/light, glow, gold rings, marble) is
 * CSS-only via `PortalDualGuardianDeco` and the dual-guardian-facade
 * stylesheet. Storybook fixture only — no Neon Auth or server imports.
 */
export function PortalDualGuardianOwls() {
  return (
    <div
      aria-hidden="true"
      className="portal-dual-guardian-owls"
      data-portal-dual-guardian-owls=""
    >
      <div
        aria-hidden="true"
        className="portal-dual-guardian-owls__frame portal-dual-guardian-owls__frame--dark"
        data-portal-dual-guardian-owl="dark"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="portal-dual-guardian-owls__image"
          draggable={false}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 70vw"
          src={BRAND_DUAL_GUARDIAN_OWL_DARK_PATH}
        />
      </div>

      <div
        aria-hidden="true"
        className="portal-dual-guardian-owls__frame portal-dual-guardian-owls__frame--light"
        data-portal-dual-guardian-owl="light"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="portal-dual-guardian-owls__image"
          draggable={false}
          fill
          priority
          sizes="(min-width: 1024px) 42vw, 70vw"
          src={BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH}
        />
      </div>
    </div>
  );
}
