import { PORTAL_NAME } from "@/lib/portal-copy";

/** Immutable theme masters (`public/brand/identity/iam-*.png`) — never overwritten by icons:generate. */
export const BRAND_MASTER_LIGHT_PATH = "/brand/identity/iam-light.png";
export const BRAND_MASTER_DARK_PATH = "/brand/identity/iam-dark.png";

/** Full auth mockup reference — design comp (public/brand/owls/guardian-dramatic-full.png). */
export const BRAND_DRAMATIC_OWL_MOCKUP_PATH = "/brand/owls/guardian-dramatic-full.png";
export const BRAND_DRAMATIC_OWL_MOCKUP_WIDTH = 1536;
export const BRAND_DRAMATIC_OWL_MOCKUP_HEIGHT = 1024;

/** Isolated painterly owl — auth vault cinematic background only (not for icons). */
export const BRAND_DRAMATIC_OWL_BACKGROUND_PATH = "/brand/owls/guardian-dramatic-iso.png";
export const BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH = 524;
export const BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT = 561;

/** Sharp owl guardian — extracted from `public/brand/heroes/auth-hero-dual.png`. */
export const BRAND_SHARP_OWL_REFERENCE_PATH = "/brand/heroes/auth-hero-dual.png";
export const BRAND_SHARP_OWL_DARK_PATH = "/brand/owls/guardian-sharp-dark.png";
export const BRAND_SHARP_OWL_LIGHT_PATH = "/brand/owls/guardian-sharp-light.png";
export const BRAND_SHARP_OWL_GUARDIAN_PATH = "/brand/owls/guardian-sharp-full.png";
export const BRAND_SHARP_OWL_WIDTH = 435;
export const BRAND_SHARP_OWL_HEIGHT = 405;

export type PortalGuardianOwlPreset = "dramatic" | "sharp";

/** @deprecated Use BRAND_DRAMATIC_OWL_BACKGROUND_* — background phantom only. */
export const BRAND_CREDENTIAL_OWL_PATH = BRAND_DRAMATIC_OWL_BACKGROUND_PATH;
export const BRAND_CREDENTIAL_OWL_WIDTH = BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH;
export const BRAND_CREDENTIAL_OWL_HEIGHT = BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT;

/** Full-bleed cinematic owl for auth vault background — decorative only. */
export const BRAND_CINEMATIC_OWL_PATH = BRAND_DRAMATIC_OWL_BACKGROUND_PATH;

/** Per-theme generated assets (`npm run icons:generate`). */
export const PORTAL_BRAND_ICON = {
  light: {
    chrome512: "/icons/iam-chrome-512-light.png",
    favicon16: "/icons/favicon-16-light.png",
    favicon32: "/icons/favicon-32-light.png",
    pwa192: "/icons/icon-192-light.png",
    pwa512: "/icons/icon-512-light.png",
    apple: "/icons/apple-touch-icon-light.png",
  },
  dark: {
    chrome512: "/icons/iam-chrome-512-dark.png",
    favicon16: "/icons/favicon-16-dark.png",
    favicon32: "/icons/favicon-32-dark.png",
    pwa192: "/icons/icon-192-dark.png",
    pwa512: "/icons/icon-512-dark.png",
    apple: "/icons/apple-touch-icon-dark.png",
  },
} as const;

export type PortalBrandTheme = keyof typeof PORTAL_BRAND_ICON;

export const BRAND_RENDER_SIZE = 512;
export const BRAND_WEB_MANIFEST_PATH = "/site.webmanifest";
export const BRAND_OG_IMAGE_PATH = "/icons/og-image.png";
export const BRAND_OG_IMAGE_WIDTH = 512;
export const BRAND_OG_IMAGE_HEIGHT = 512;

export const BRAND_MARK_NAME = "iAM";
export const BRAND_ICON_ALT = `${BRAND_MARK_NAME} — ${PORTAL_NAME} logo`;

/**
 * Shell + img closed set — mark stays inside fixed slot (overflow-hidden, object-contain).
 * Dual imgs stack absolutely inside the shell; theme swap via dark:hidden / hidden dark:block.
 */
export const PORTAL_BRAND_SHELL = {
  /** Inner img — fills padded shell box without bleeding past edges. */
  imgBase:
    "absolute inset-0 m-auto size-full max-h-full max-w-full object-contain object-center p-0 border-0 bg-transparent",
  /** 32px chrome slot — sidebar, toolbar (2px inset padding). */
  chromeShell:
    "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-transparent p-0.5",
  /** 24px compact slot — team-switcher dropdown rows. */
  compactShell:
    "relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-transparent p-px",
  /** Hero vault frame — larger contain slot with vault chrome on shell only. */
  heroShell:
    "relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-vault-surface p-3 ring-1 ring-vault-rim shadow-[0_0_48px_var(--vault-glow)] sm:size-32 sm:p-3.5 lg:size-36 lg:p-4",
  /** @deprecated Use chromeShell — kept for non-brand icon slots in dashboard-nav. */
  slot: "center size-8 shrink-0 p-0 leading-none",
} as const;

/** Display contexts — each maps to shell bounds, img fit, and a11y. */
export type BrandContext = "sidebar" | "toolbar" | "compact" | "hero";

export type BrandContextConfig = {
  shellClass: string;
  decorative: boolean;
  mode: "chrome" | "hero";
};

export const BRAND_CONTEXT: Record<BrandContext, BrandContextConfig> = {
  sidebar: {
    shellClass: PORTAL_BRAND_SHELL.chromeShell,
    decorative: true,
    mode: "chrome",
  },
  toolbar: {
    shellClass: PORTAL_BRAND_SHELL.chromeShell,
    decorative: true,
    mode: "chrome",
  },
  compact: {
    shellClass: PORTAL_BRAND_SHELL.compactShell,
    decorative: true,
    mode: "chrome",
  },
  hero: {
    shellClass: PORTAL_BRAND_SHELL.heroShell,
    decorative: false,
    mode: "hero",
  },
};

export const BRAND_CHROME_CONTEXTS = new Set<BrandContext>([
  "sidebar",
  "toolbar",
  "compact",
]);

/** Expected outer shell dimensions (px) per context — used by validation + Storybook proof. */
export const BRAND_SHELL_BOUNDS: Record<
  BrandContext,
  { outerPx: number; paddingPx: number }
> = {
  sidebar: { outerPx: 32, paddingPx: 2 },
  toolbar: { outerPx: 32, paddingPx: 2 },
  compact: { outerPx: 24, paddingPx: 1 },
  hero: { outerPx: 112, paddingPx: 12 },
};
