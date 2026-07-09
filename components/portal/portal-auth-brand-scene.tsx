import {
  BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT,
  BRAND_DRAMATIC_OWL_BACKGROUND_PATH,
  BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH,
} from "@/lib/copy/portal-brand";

/**
 * Cinematic guardian owl — full-bleed background scene for the auth vault.
 * Mounted directly inside portal-auth-vault (position: relative, isolate).
 *
 * Tuning lives in portal-auth-phantom.storybook.css (Storybook-only import).
 */
export function PortalAuthPhantomOwl() {
  return (
    <>
      <div aria-hidden className="portal-auth-phantom-glow" />
      <div aria-hidden className="portal-auth-phantom-keylight" />

      <div aria-hidden className="portal-auth-phantom-owl">
        <img
          src={BRAND_DRAMATIC_OWL_BACKGROUND_PATH}
          alt=""
          width={BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH}
          height={BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT}
          decoding="async"
          aria-hidden
          className="portal-auth-phantom-owl-img"
        />
      </div>

      <div aria-hidden className="portal-auth-cinematic-scrim" />
    </>
  );
}
