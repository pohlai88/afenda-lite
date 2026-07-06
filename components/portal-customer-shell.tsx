import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ClientSignOutButton } from "@/components/client-sign-out-button";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

export function PortalCustomerShell({
  eyebrow,
  title,
  description,
  children,
  backHref,
  backLabel,
  showSignOut = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  showSignOut?: boolean;
}) {
  return (
    <div className="portal-shell">
      <a href="#customer-content" className="portal-skip-link">
        {portalCopy.declarationPage.skipLink}
      </a>

      {(backHref || showSignOut) && (
        <div className="portal-header">
          <div className="portal-header-inner max-w-lg">
            {backHref ? (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 h-auto px-2 py-1 text-muted-foreground"
                render={<Link href={backHref} />}
                nativeButton={false}
              >
                <ArrowLeftIcon />
                {backLabel}
              </Button>
            ) : (
              <span />
            )}
            {showSignOut ? <ClientSignOutButton /> : null}
          </div>
        </div>
      )}

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
