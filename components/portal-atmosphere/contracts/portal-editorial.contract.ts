import type {
  PortalAtmosphereTheme,
  PortalInversionMode,
} from "./portal-theme.contract";

export type PortalEditorialVariant = "classic" | "sharp";

export interface PortalSharpEditorialCopy {
  readonly headline: string;
  readonly subtitle: string;
  readonly seal?: string;
}

export interface PortalEditorialCopy {
  readonly truth: string;
  readonly connector: string;
  readonly protected: string;
  /** Optional override; defaults via `resolvePortalSealText()` in `portal-seal.contract`. */
  readonly seal?: string;
}

export interface PortalEditorialContract {
  readonly copy: PortalEditorialCopy;
  readonly inversionMode: PortalInversionMode;
}

/** Semantic page title for the default editorial statement (PA-P4 / PA-P9). */
export const PORTAL_EDITORIAL_HEADING = "Truth is protected";

export const DEFAULT_PORTAL_EDITORIAL_COPY = {
  truth: "TRUTH",
  connector: "IS",
  protected: "PROTECTED",
} as const satisfies PortalEditorialCopy;

export const SHARP_OWL_SEAL = "Confidential. Secure. Always.";

export const SHARP_OWL_EDITORIAL_BY_THEME = {
  dark: {
    headline: "Truth, held quietly.",
    subtitle: "Guarded for trusted declarations.",
    seal: SHARP_OWL_SEAL,
  },
  light: {
    headline: "Protected by clarity.",
    subtitle: "Guarded for trusted declarations.",
    seal: SHARP_OWL_SEAL,
  },
} as const satisfies Record<PortalAtmosphereTheme, PortalSharpEditorialCopy>;

export function resolveSharpEditorialCopy(
  theme: PortalAtmosphereTheme,
): PortalSharpEditorialCopy {
  return SHARP_OWL_EDITORIAL_BY_THEME[theme];
}

export function resolveSharpEditorialHeading(theme: PortalAtmosphereTheme): string {
  return SHARP_OWL_EDITORIAL_BY_THEME[theme].headline.replace(/\.$/, "");
}

export function formatPortalEditorialHeading(copy: PortalEditorialCopy): string {
  return `${copy.truth.toLocaleLowerCase()} ${copy.connector.toLocaleLowerCase()} ${copy.protected.toLocaleLowerCase()}`;
}
