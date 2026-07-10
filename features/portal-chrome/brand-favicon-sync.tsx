"use client";

import { useEffect } from "react";
import { PORTAL_BRAND_ICON } from "@/lib/copy/portal-brand";
import { useTheme } from "@/features/portal-chrome/theme-provider";

/** Sync tab favicon when the user manually toggles theme (media queries follow OS only). */
export function BrandFaviconSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const href =
      resolvedTheme === "dark"
        ? PORTAL_BRAND_ICON.dark.favicon32
        : PORTAL_BRAND_ICON.light.favicon32;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  }, [resolvedTheme]);

  return null;
}
