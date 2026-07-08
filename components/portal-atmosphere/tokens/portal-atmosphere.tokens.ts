/**
 * Portal Atmosphere token contract.
 *
 * PA-P1 doctrine:
 * - CSS is runtime authority.
 * - TypeScript owns token names and compile-time contracts only.
 * - Do not duplicate OKLCH color values in TypeScript.
 * - Do not encode owl, hero, auth, layout, or rendering behavior here.
 *
 * shadcn boundary:
 * - Generic surfaces remain governed by shadcn tokens such as
 *   --background, --foreground, --card, --border, --ring.
 * - Portal atmosphere tokens may reference those generic values in CSS,
 *   but shadcn tokens must never receive portal-specific meanings such as
 *   owl, hero, seal, vault, glow, or editorial inversion.
 */

export const PORTAL_ATMOSPHERE_TOKEN_NAMES = [
  "--portal-bg",
  "--portal-fg",
  "--portal-card-adjacent",
  "--portal-muted",
  "--portal-border",
  "--portal-ring",
  "--portal-owl-line",
  "--portal-owl-shadow",
  "--portal-owl-highlight",
  "--portal-hero-truth",
  "--portal-hero-protected",
  "--portal-hero-is",
  "--portal-hero-rule",
  "--portal-glow-primary",
  "--portal-glow-soft",
] as const;

export type PortalAtmosphereTokenName =
  (typeof PORTAL_ATMOSPHERE_TOKEN_NAMES)[number];

export function isPortalAtmosphereTokenName(
  value: string,
): value is PortalAtmosphereTokenName {
  return (PORTAL_ATMOSPHERE_TOKEN_NAMES as readonly string[]).includes(value);
}

export function assertPortalAtmosphereTokenName(
  value: string,
): asserts value is PortalAtmosphereTokenName {
  if (!isPortalAtmosphereTokenName(value)) {
    throw new Error(`Unknown Portal Atmosphere token: ${value}`);
  }
}
