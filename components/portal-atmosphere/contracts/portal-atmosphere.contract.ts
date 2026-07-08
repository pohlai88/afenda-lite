import {
  PORTAL_ATMOSPHERE_TOKEN_NAMES,
  type PortalAtmosphereTokenName,
} from "../tokens/portal-atmosphere.tokens";
import type {
  PortalThemeClassName,
  PortalThemeSelection,
} from "./portal-theme.contract";
import {
  getPortalInversionMode,
  normalizePortalThemeSelection,
  resolvePortalThemeClassName,
  type PortalAtmosphereTheme,
  type PortalInversionMode,
} from "./portal-theme.contract";

export interface PortalAtmosphereContract {
  readonly theme: PortalAtmosphereTheme;
  readonly inversionMode: PortalInversionMode;
  readonly tokenNames: readonly PortalAtmosphereTokenName[];
}

export interface PortalAtmosphereThemeAttributes {
  readonly "data-portal-atmosphere": "";
  readonly "data-portal-theme": PortalAtmosphereTheme;
  readonly "data-portal-inversion": PortalInversionMode;
}

export type PortalThemeSurfaceProps = PortalAtmosphereThemeAttributes & {
  readonly className: PortalThemeClassName;
};

export function buildPortalAtmosphereThemeAttributes(
  selection: PortalThemeSelection,
): PortalAtmosphereThemeAttributes {
  return {
    "data-portal-atmosphere": "",
    "data-portal-theme": selection.theme,
    "data-portal-inversion": selection.inversionMode,
  };
}

export function resolvePortalThemeSurface(
  selection: PortalThemeSelection,
): PortalThemeSurfaceProps {
  const normalized = normalizePortalThemeSelection(selection);

  return {
    className: resolvePortalThemeClassName(normalized.theme),
    ...buildPortalAtmosphereThemeAttributes(normalized),
  };
}

export function resolvePortalThemeSurfaceFromTheme(
  theme: PortalAtmosphereTheme,
): PortalThemeSurfaceProps {
  return resolvePortalThemeSurface({
    theme,
    inversionMode: getPortalInversionMode(theme),
  });
}

export function buildPortalAtmosphereContract(
  selection: PortalThemeSelection,
  tokenNames: readonly PortalAtmosphereTokenName[] = PORTAL_ATMOSPHERE_TOKEN_NAMES,
): PortalAtmosphereContract {
  const normalized = normalizePortalThemeSelection(selection);

  return {
    theme: normalized.theme,
    inversionMode: normalized.inversionMode,
    tokenNames,
  };
}
