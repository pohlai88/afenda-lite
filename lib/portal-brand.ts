import { PORTAL_NAME } from "@/lib/portal-copy";

/** Master display asset (512×512, generated from source). */
export const BRAND_ICON_PATH = "/brandicondisk.png";
export const BRAND_ICON_WIDTH = 512;
export const BRAND_ICON_HEIGHT = 512;

/** Browser-level icon assets (`npm run icons:generate`). */
export const BRAND_FAVICON_16_PATH = "/icons/favicon-16.png";
export const BRAND_FAVICON_32_PATH = "/icons/favicon-32.png";
export const BRAND_APPLE_ICON_PATH = "/icons/apple-touch-icon.png";
export const BRAND_PWA_ICON_192_PATH = "/icons/icon-192.png";
export const BRAND_PWA_ICON_512_PATH = "/icons/icon-512.png";
export const BRAND_OG_IMAGE_PATH = "/icons/og-image.png";
export const BRAND_OG_IMAGE_WIDTH = 512;
export const BRAND_OG_IMAGE_HEIGHT = 512;
export const BRAND_WEB_MANIFEST_PATH = "/site.webmanifest";

export const BRAND_MARK_NAME = "iAM";
export const BRAND_ICON_ALT = `${BRAND_MARK_NAME} — ${PORTAL_NAME} logo`;

/** Display contexts — each maps to asset size, layout, and a11y. */
export type BrandContext = "sidebar" | "toolbar" | "compact" | "hero";

type BrandAsset = {
  path: string;
  width: number;
  height: number;
  sizes: string;
};

export const BRAND_CONTEXT: Record<
  BrandContext,
  {
    asset: BrandAsset;
    className: string;
    decorative: boolean;
  }
> = {
  /** shadcn sidebar `size-8` slot — object-contain inside rounded-lg shell */
  sidebar: {
    asset: {
      path: BRAND_FAVICON_32_PATH,
      width: 32,
      height: 32,
      sizes: "32px",
    },
    className: "size-full object-contain",
    decorative: true,
  },
  /** Auth toolbar / linked wordmark companion */
  toolbar: {
    asset: {
      path: BRAND_FAVICON_32_PATH,
      width: 32,
      height: 32,
      sizes: "40px",
    },
    className: "size-10 shrink-0 rounded-lg object-contain ring-1 ring-border/50",
    decorative: true,
  },
  /** Customer shell header — minimal footprint */
  compact: {
    asset: {
      path: BRAND_FAVICON_32_PATH,
      width: 32,
      height: 32,
      sizes: "32px",
    },
    className: "size-8 shrink-0 rounded-lg object-contain ring-1 ring-border/50",
    decorative: true,
  },
  /** Landing hero — LCP, meaningful alt */
  hero: {
    asset: {
      path: BRAND_PWA_ICON_192_PATH,
      width: 192,
      height: 192,
      sizes: "(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px",
    },
    className:
      "size-28 rounded-2xl object-contain ring-1 ring-border/40 bg-black shadow-[0_0_48px_var(--vault-glow)] sm:size-32 lg:size-36",
    decorative: false,
  },
};
