import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ClientBreadcrumb } from "@/components/client-breadcrumb";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { ClientSignOutButton } from "@/components/client-sign-out-button";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type PortalCustomerContentWidth = "narrow" | "client";

export function PortalCustomerShell({
  eyebrow,
  title,
  description,
  children,
  backHref,
  backLabel,
  showSignOut = false,
  homeHref,
  breadcrumbs,
  contentWidth = "client",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  showSignOut?: boolean;
  homeHref?: string;
  breadcrumbs?: { label: string; href?: string }[];
  /** narrow: invite/simple forms (max-w-lg). client: dashboard + wizard (max-w-4xl/5xl). */
  contentWidth?: PortalCustomerContentWidth;
}) {
  const contentWidthClass =
    contentWidth === "narrow" ? "portal-content-narrow" : "portal-content-client";
  const mainClass =
    contentWidth === "narrow" ? "portal-main-narrow" : "portal-main-client";

  return (
    <div className="portal-shell">
      <a href="#customer-content" className="portal-skip-link">
        {portalCopy.declarationPage.skipLink}
      </a>

      <div className="portal-header">
        <div className={cn("portal-header-inner", contentWidthClass)}>
          {backHref ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-auto px-2 py-1 text-muted-foreground"
              render={<Link href={backHref} />}
              nativeButton={false}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {backLabel}
            </Button>
          ) : homeHref ? (
            <Link
              href={homeHref}
              translate="no"
              className="text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PORTAL_NAME}
            </Link>
          ) : (
            <span translate="no" className="text-xs text-muted-foreground">
              {PORTAL_NAME}
            </span>
          )}
          <div className="h-stack items-center gap-1">
            <PortalThemeToggle />
            {showSignOut ? <ClientSignOutButton /> : null}
          </div>
        </div>
      </div>

      <main
        id="customer-content"
        className={cn(mainClass, "v-stack gap-6 sm:py-10")}
      >
        {breadcrumbs ? (
          <ClientBreadcrumb items={breadcrumbs} />
        ) : null}
        <header className="space-y-3">
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
