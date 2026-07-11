import type { ReactNode } from "react";
import { LoginPage02Chrome } from "@/features/auth/studio/login-page-02-chrome";
import { PORTAL_NAME } from "@/modules/platform/copy/portal-copy";

/**
 * Production auth chrome — Studio login-page-02 kit + `.auth-surface` island.
 * CSS: preserve `app/auth-surface.css` (Neon Tailwind + scoped tokens).
 * Do not theme via AdminCN ThemeCustomizer / `:root`.
 */
export function StudioAuthShell({
  children,
  backHref = "/",
  backLabel = "Back to the website",
  className,
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <LoginPage02Chrome
      brandName={PORTAL_NAME}
      backHref={backHref}
      backLabel={backLabel}
      className={className}
    >
      {children}
    </LoginPage02Chrome>
  );
}
