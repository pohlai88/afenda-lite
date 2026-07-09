import { PORTAL_NAME } from "./portal-name";

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

/** Single guardian core — morpho / Fade Owl variant (not prod dual cutouts). */
export const GUARDIAN_DRAMATIC_OWL_CORE_PATH = BRAND_DRAMATIC_OWL_BACKGROUND_PATH;

/**
 * Dual Guardian Facade base units — curated `owl-variants/allowed-base/`
 * removebg PNGs. Both owls render together (night + light guardians in one
 * cinematic poster); atmosphere is CSS-only (`PortalDualGuardianDeco`).
 */
export const BRAND_DUAL_GUARDIAN_OWL_DARK_PATH =
  "/owl-variants/allowed-base/darkbg-removebg-preview2.png";
export const BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH =
  "/owl-variants/allowed-base/whitebg-removebg-preview2.png";
export const BRAND_DUAL_GUARDIAN_OWL_DARK_WIDTH = 408;
export const BRAND_DUAL_GUARDIAN_OWL_DARK_HEIGHT = 297;
export const BRAND_DUAL_GUARDIAN_OWL_LIGHT_WIDTH = 408;
export const BRAND_DUAL_GUARDIAN_OWL_LIGHT_HEIGHT = 315;

/** Comp-laptop guardian base units (transparent removebg) — CSS deco layers on top. */
export const BRAND_COMP_OWL_DARK_PATH = BRAND_DUAL_GUARDIAN_OWL_DARK_PATH;
export const BRAND_COMP_OWL_LIGHT_PATH = BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH;
export const BRAND_COMP_OWL_WIDTH = BRAND_DUAL_GUARDIAN_OWL_DARK_WIDTH;
export const BRAND_COMP_OWL_HEIGHT = BRAND_DUAL_GUARDIAN_OWL_DARK_HEIGHT;

/** Sharp owl guardian — comp reference + allowed-base stand-ins until extracted PNGs return. */
export const BRAND_SHARP_OWL_REFERENCE_PATH = "/brand/heroes/auth-hero-dual.png";
export const BRAND_SHARP_OWL_DARK_PATH = BRAND_DUAL_GUARDIAN_OWL_DARK_PATH;
export const BRAND_SHARP_OWL_LIGHT_PATH = BRAND_DUAL_GUARDIAN_OWL_LIGHT_PATH;
export const BRAND_SHARP_OWL_GUARDIAN_PATH = BRAND_DUAL_GUARDIAN_OWL_DARK_PATH;
export const BRAND_SHARP_OWL_WIDTH = BRAND_DUAL_GUARDIAN_OWL_DARK_WIDTH;
export const BRAND_SHARP_OWL_HEIGHT = BRAND_DUAL_GUARDIAN_OWL_DARK_HEIGHT;

/**
 * Guardian Auth facade — single dramatic iso; day/night are CSS presentations (morpho).
 */
export const GUARDIAN_AUTH_OWL_DAY_PATH = GUARDIAN_DRAMATIC_OWL_CORE_PATH;
export const GUARDIAN_AUTH_OWL_NIGHT_PATH = GUARDIAN_DRAMATIC_OWL_CORE_PATH;

export const GUARDIAN_AUTH_ASSET_SET = {
  owlDay: GUARDIAN_AUTH_OWL_DAY_PATH,
  owlNight: GUARDIAN_AUTH_OWL_NIGHT_PATH,
} as const;

/**
 * Fade Owl experiment (Storybook fixture only).
 * Variants: `dual` (light ↔ night PNG) · `morpho` (dramatic iso).
 */
export const FADE_OWL_ASSETS_LIGHT_PATH = "/assets/light-guardian.png";
export const FADE_OWL_ASSETS_NIGHT_PATH = "/assets/night-guardian.png";
/** Optional Vault Threshold emblem — fixture may omit overlay. */
export const FADE_OWL_ASSETS_VAULT_THRESHOLD_PATH = "/assets/vault-threshold.png";

/** Morpho variant — single dramatic iso (`guardian-dramatic-iso.png`). */
export const FADE_OWL_GUARDIAN_OWL_PATH = GUARDIAN_DRAMATIC_OWL_CORE_PATH;

/** Dual variant render paths (light ↔ night PNG cross-fade). */
export const FADE_OWL_RENDER_LIGHT_PATH = FADE_OWL_ASSETS_LIGHT_PATH;
export const FADE_OWL_RENDER_NIGHT_PATH = FADE_OWL_ASSETS_NIGHT_PATH;
export const FADE_OWL_RENDER_VAULT_THRESHOLD_PATH =
  FADE_OWL_ASSETS_VAULT_THRESHOLD_PATH;

export const FADE_OWL_OWL_WIDTH = BRAND_DRAMATIC_OWL_BACKGROUND_WIDTH;
export const FADE_OWL_OWL_HEIGHT = BRAND_DRAMATIC_OWL_BACKGROUND_HEIGHT;

export const FADE_OWL_ASSET_MANIFEST = {
  light: FADE_OWL_RENDER_LIGHT_PATH,
  night: FADE_OWL_RENDER_NIGHT_PATH,
  owlCore: FADE_OWL_GUARDIAN_OWL_PATH,
  lightStandIn: FADE_OWL_RENDER_LIGHT_PATH,
  nightStandIn: FADE_OWL_RENDER_NIGHT_PATH,
  vaultThreshold: FADE_OWL_ASSETS_VAULT_THRESHOLD_PATH,
  vaultThresholdRender: FADE_OWL_RENDER_VAULT_THRESHOLD_PATH,
} as const;

export type FadeOwlMode = "light" | "night";

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
