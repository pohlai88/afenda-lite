import type { ReactNode } from "react";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";

export function PortalCustomerShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="portal-shell">
      <a href="#customer-content" className="portal-skip-link">
        {portalCopy.declarationPage.skipLink}
      </a>

      <main
        id="customer-content"
        className="portal-main-narrow flex flex-col gap-6 sm:py-10"
      >
        <header className="space-y-3">
          <p className="text-xs text-muted-foreground" translate="no">
            {PORTAL_NAME}
          </p>
          <PortalEyebrow>{eyebrow}</PortalEyebrow>
          <h1 className="portal-page-title sm:text-3xl">{title}</h1>
          {description ? (
            <p className="portal-page-description">{description}</p>
          ) : null}
        </header>
        {children}
      </main>
    </div>
  );
}
