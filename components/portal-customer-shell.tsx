import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { BrandLogo } from "@/components/portal-brand-mark";
import {
  PortalPageHeader,
  type PortalBreadcrumb,
} from "@/components/portal-page-header";
import { PortalBreadcrumbList } from "@/components/portal-breadcrumb-list";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { ClientSignOutButton } from "@/components/client-sign-out-button";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PortalCustomerContentWidth = "narrow" | "client";
type PortalCustomerVariant = "standalone" | "app";

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
  variant = "standalone",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
  showSignOut?: boolean;
  homeHref?: string;
  breadcrumbs?: PortalBreadcrumb[];
  contentWidth?: PortalCustomerContentWidth;
  /** app: inside client sidebar shell. standalone: invite/public flows. */
  variant?: PortalCustomerVariant;
}) {
  const contentWidthClass =
    contentWidth === "narrow" ? "portal-content-narrow" : "portal-content-client";
  const mainClass =
    contentWidth === "narrow" ? "portal-main-narrow" : "portal-main-client";
  const isApp = variant === "app";

  const pageHeader = (
    <>
      {breadcrumbs && !isApp ? (
        <PortalBreadcrumbList
          items={breadcrumbs}
          maxWidthClass="min-w-0 max-w-full"
        />
      ) : null}
      <header className="space-y-3">
        <PortalEyebrow>{eyebrow}</PortalEyebrow>
        <h1 className="portal-page-title">{title}</h1>
        {description ? (
          <p className="portal-page-description">{description}</p>
        ) : null}
      </header>
    </>
  );

  if (isApp) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <a href="#customer-content" className="portal-skip-link">
          {portalCopy.declarationPage.skipLink}
        </a>
        <PortalPageHeader breadcrumbs={breadcrumbs} sticky />
        <div
          id="customer-content"
          className={cn(mainClass, "v-stack gap-6 md:gap-8")}
        >
          {pageHeader}
          {children}
        </div>
      </div>
    );
  }

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
            <BrandLogo href={homeHref} context="compact" showName />
          ) : (
            <BrandLogo href={null} context="compact" showName />
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
        {pageHeader}
        {children}
      </main>
    </div>
  );
}
