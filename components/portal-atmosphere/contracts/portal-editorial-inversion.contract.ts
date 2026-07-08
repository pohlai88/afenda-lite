import {
  getPortalInversionMode,
  type PortalAtmosphereTheme,
} from "./portal-theme.contract";

export type PortalHeroWordRole = "truth" | "protected";

export interface PortalHeroInversionDecision {
  readonly theme: PortalAtmosphereTheme;
  readonly invertedWord: PortalHeroWordRole;
}

/**
 * ADR theme inversion rule (derived from `getPortalInversionMode`):
 * - Dark theme: PROTECTED inverted only.
 * - Light theme: TRUTH inverted only.
 */
export function resolvePortalHeroInvertedWord(
  theme: PortalAtmosphereTheme,
): PortalHeroWordRole {
  return getPortalInversionMode(theme) === "dark-truth-readable"
    ? "protected"
    : "truth";
}

export function isPortalHeroWordInverted(
  theme: PortalAtmosphereTheme,
  word: PortalHeroWordRole,
): boolean {
  return resolvePortalHeroInvertedWord(theme) === word;
}

export function resolvePortalHeroInversionDecision(
  theme: PortalAtmosphereTheme,
): PortalHeroInversionDecision {
  return {
    theme,
    invertedWord: resolvePortalHeroInvertedWord(theme),
  };
}
