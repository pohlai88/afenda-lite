/**
 * Production Portal Atmosphere API.
 *
 * Design-review fixtures live under `./fixtures/` — import them directly in
 * Storybook (`@/components/portal-atmosphere/fixtures/*`), not from this barrel.
 */

export {
  PORTAL_ATMOSPHERE_TOKEN_NAMES,
  assertPortalAtmosphereTokenName,
  isPortalAtmosphereTokenName,
  type PortalAtmosphereTokenName,
} from "./tokens/portal-atmosphere.tokens";

export {
  DEFAULT_PORTAL_THEME_SELECTION,
  PORTAL_ATMOSPHERE_THEMES,
  PORTAL_INVERSION_MODES,
  getPortalInversionMode,
  isPortalAtmosphereTheme,
  isPortalInversionMode,
  normalizePortalThemeSelection,
  resolvePortalThemeClassName,
  type PortalAtmosphereTheme,
  type PortalInversionMode,
  type PortalThemeClassName,
  type PortalThemeSelection,
} from "./contracts/portal-theme.contract";

export {
  resolvePortalThemeSurfaceFromTheme,
  type PortalAtmosphereThemeAttributes,
  type PortalThemeSurfaceProps,
} from "./contracts/portal-atmosphere.contract";

export {
  DEFAULT_PORTAL_EDITORIAL_COPY,
  PORTAL_EDITORIAL_HEADING,
  SHARP_OWL_EDITORIAL_BY_THEME,
  formatPortalEditorialHeading,
  resolveSharpEditorialCopy,
  resolveSharpEditorialHeading,
  type PortalEditorialCopy,
  type PortalEditorialVariant,
  type PortalSharpEditorialCopy,
} from "./contracts/portal-editorial.contract";

export { PortalAtmosphere } from "./PortalAtmosphere";
export type { PortalAtmosphereProps } from "./PortalAtmosphere";

export { PortalBackgroundLayers } from "./PortalBackgroundLayers";

export { PortalGuardianOwl } from "./PortalGuardianOwl";
export type { PortalGuardianOwlProps } from "./PortalGuardianOwl";

export {
  isPortalHeroWordInverted,
  resolvePortalHeroInvertedWord,
  type PortalHeroWordRole,
} from "./contracts/portal-editorial-inversion.contract";

export { PortalEditorialHero } from "./PortalEditorialHero";
export type { PortalEditorialHeroProps } from "./PortalEditorialHero";

export { PortalHeroWord } from "./PortalHeroWord";
export type { PortalHeroWordProps } from "./PortalHeroWord";

export { PortalHeroConnector } from "./PortalHeroConnector";
export type { PortalHeroConnectorProps } from "./PortalHeroConnector";

export {
  DEFAULT_PORTAL_SEAL_COPY,
  DEFAULT_PORTAL_SEAL_TEXT,
  formatPortalSealCopy,
  resolvePortalSealText,
  type PortalSealCopy,
} from "./contracts/portal-seal.contract";

export { PortalSealLine } from "./PortalSealLine";
export type { PortalSealLineProps } from "./PortalSealLine";

export { PortalAccessSlot } from "./PortalAccessSlot";
export type { PortalAccessSlotProps } from "./PortalAccessSlot";
