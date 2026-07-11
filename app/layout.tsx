import type { Metadata, Viewport } from "next";
import "./globals.css";
import { portalFontClassName } from "./fonts";
import { BrandFaviconSync } from "@/features/portal-chrome/brand-favicon-sync";
import { PortalAuthProvider } from "@/features/auth/portal-auth-provider";
import { ThemeProvider } from "@/features/portal-chrome/theme-provider";
import { Toaster } from "@/components-V2/platform-components/ui/sonner";
import {
  fontGeist,
  fontGeistMono,
} from "@/components-V2/platform-utils/fonts";
import { getAppBaseUrl } from "@/modules/platform/app-url";
import {
  BRAND_OG_IMAGE_HEIGHT,
  BRAND_OG_IMAGE_PATH,
  BRAND_OG_IMAGE_WIDTH,
  BRAND_WEB_MANIFEST_PATH,
  BRAND_ICON_ALT,
  PORTAL_BRAND_ICON,
} from "@/features/portal-chrome/portal-brand";
import { PORTAL_NAME, portalCopy } from "@/modules/platform/copy/portal-copy";
import { PORTAL_THEME_BOOT_SCRIPT } from "@/features/portal-chrome/portal-theme";
import { cn } from "@/modules/platform/utils";

// Auth, cookies, and session-aware UI run on every route — opt out of static prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(getAppBaseUrl()),
  title: {
    default: PORTAL_NAME,
    template: `%s | ${PORTAL_NAME}`,
  },
  description: portalCopy.trust.meta.defaultDescription,
  keywords: [...portalCopy.trust.meta.keywords],
  manifest: BRAND_WEB_MANIFEST_PATH,
  icons: {
    icon: [
      {
        url: PORTAL_BRAND_ICON.light.favicon32,
        type: "image/png",
        sizes: "32x32",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: PORTAL_BRAND_ICON.dark.favicon32,
        type: "image/png",
        sizes: "32x32",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: PORTAL_BRAND_ICON.light.apple,
        type: "image/png",
        sizes: "180x180",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: PORTAL_BRAND_ICON.dark.apple,
        type: "image/png",
        sizes: "180x180",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
  openGraph: {
    title: PORTAL_NAME,
    description: portalCopy.trust.meta.defaultDescription,
    type: "website",
    siteName: PORTAL_NAME,
    images: [
      {
        url: BRAND_OG_IMAGE_PATH,
        width: BRAND_OG_IMAGE_WIDTH,
        height: BRAND_OG_IMAGE_HEIGHT,
        alt: BRAND_ICON_ALT,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: PORTAL_NAME,
    description: portalCopy.trust.meta.defaultDescription,
    images: [BRAND_OG_IMAGE_PATH],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={cn(
        portalFontClassName,
        fontGeist.variable,
        fontGeistMono.variable,
      )}
    >
      <body className="min-w-0 overflow-x-clip">
        <script
          dangerouslySetInnerHTML={{ __html: PORTAL_THEME_BOOT_SCRIPT }}
        />
        <ThemeProvider defaultTheme="system">
          <BrandFaviconSync />
          <PortalAuthProvider>
            {children}
          </PortalAuthProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
