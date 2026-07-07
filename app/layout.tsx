import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ebGaramond, lato } from "./fonts";
import { authClient } from "@/lib/auth/client";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  BRAND_WEB_MANIFEST_PATH,
} from "@/lib/portal-brand";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

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
  openGraph: {
    title: PORTAL_NAME,
    description: portalCopy.trust.meta.defaultDescription,
    type: "website",
    siteName: PORTAL_NAME,
  },
  twitter: {
    card: "summary",
    title: PORTAL_NAME,
    description: portalCopy.trust.meta.defaultDescription,
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
      className={cn(lato.variable, ebGaramond.variable, "font-sans")}
    >
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("client-declaration-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
        <ThemeProvider defaultTheme="system">
          <NeonAuthUIProvider
            authClient={authClient}
            redirectTo="/client"
            emailOTP
          >
            {children}
            <Toaster richColors closeButton />
          </NeonAuthUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
