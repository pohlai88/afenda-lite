export const PORTAL_ATMOSPHERE_THEMES = ["dark", "light"] as const;

export type PortalAtmosphereTheme = (typeof PORTAL_ATMOSPHERE_THEMES)[number];

export const PORTAL_INVERSION_MODES = [
  "dark-truth-readable",
  "light-protected-readable",
] as const;

export type PortalInversionMode = (typeof PORTAL_INVERSION_MODES)[number];

/**
 * Paired theme + inversion for contract tests and generators.
 * `inversionMode` is always derived from `theme` via
 * {@link normalizePortalThemeSelection} — never set independently at DOM time.
 */
export interface PortalThemeSelection {
  readonly theme: PortalAtmosphereTheme;
  readonly inversionMode: PortalInversionMode;
}

/**
 * ADR theme inversion mode — names the readable hero word per theme.
 * Dark: TRUTH readable (PROTECTED inverted). Light: PROTECTED readable (TRUTH inverted).
 */
export function getPortalInversionMode(
  theme: PortalAtmosphereTheme,
): PortalInversionMode {
  return theme === "dark"
    ? "dark-truth-readable"
    : "light-protected-readable";
}

export const DEFAULT_PORTAL_THEME_SELECTION = {
  theme: "dark",
  inversionMode: getPortalInversionMode("dark"),
} as const satisfies PortalThemeSelection;

export type PortalThemeClassName =
  | "portal-atmosphere-theme-dark"
  | "portal-atmosphere-theme-light";

const PORTAL_THEME_CLASS_NAMES: Record<PortalAtmosphereTheme, PortalThemeClassName> =
  {
    dark: "portal-atmosphere-theme-dark",
    light: "portal-atmosphere-theme-light",
  };

export function isPortalAtmosphereTheme(
  value: string,
): value is PortalAtmosphereTheme {
  return (PORTAL_ATMOSPHERE_THEMES as readonly string[]).includes(value);
}

export function isPortalInversionMode(
  value: string,
): value is PortalInversionMode {
  return (PORTAL_INVERSION_MODES as readonly string[]).includes(value);
}

export function resolvePortalThemeClassName(
  theme: PortalAtmosphereTheme,
): PortalThemeClassName {
  return PORTAL_THEME_CLASS_NAMES[theme];
}

/** Keeps theme and inversion mode aligned — callers cannot drift `data-portal-inversion`. */
export function normalizePortalThemeSelection(
  selection: PortalThemeSelection,
): PortalThemeSelection {
  return {
    theme: selection.theme,
    inversionMode: getPortalInversionMode(selection.theme),
  };
}
