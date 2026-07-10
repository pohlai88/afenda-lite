"use client";

import "./globals.css";
import { PortalRouteError } from "@/features/portal-chrome/portal-route-error";
import { portalFontClassName } from "@/app/fonts";
import { portalCopy } from "@/lib/copy/portal-copy";
import { AUTH_SIGN_IN_HREF } from "@/lib/routing/portal-routes";
import { PORTAL_THEME_BOOT_SCRIPT } from "@/lib/copy/portal-theme";
import { cn } from "@/lib/utils";

/** Root error boundary — must define its own html/body (outside root layout). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = portalCopy.errors.globalBoundary;

  return (
    <html suppressHydrationWarning lang="en" className={cn(portalFontClassName)}>
      <body className="portal-shell min-w-0 overflow-x-clip">
        <script dangerouslySetInnerHTML={{ __html: PORTAL_THEME_BOOT_SCRIPT }} />
        <PortalRouteError
          backHref={AUTH_SIGN_IN_HREF}
          backLabel={portalCopy.errors.routeBoundary.root.backLabel}
          description={copy.description}
          error={error}
          reset={reset}
          retryLabel={copy.retryLabel}
          title={copy.title}
        />
      </body>
    </html>
  );
}
