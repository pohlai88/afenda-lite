import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { UserButton } from "@/components/user-button";
import { Button } from "@/components/ui/button";

type PortalShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

export function PortalShell({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  headerActions,
  children,
}: PortalShellProps) {
  return (
    <div className="portal-shell">
      <a href="#portal-main" className="portal-skip-link">
        Skip to main content
      </a>

      <header className="portal-header">
        <div className="portal-header-inner max-w-5xl">
          <div className="min-w-0 flex-1">
            {backHref ? (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 mb-2 h-auto px-2 py-1 text-muted-foreground"
                render={<Link href={backHref} />}
                nativeButton={false}
              >
                <ArrowLeftIcon />
                {backLabel}
              </Button>
            ) : null}
            <PortalEyebrow className="mb-2">{eyebrow}</PortalEyebrow>
            <h1 className="portal-page-title truncate">{title}</h1>
            {description ? (
              <p className="portal-page-description mt-1">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <PortalThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      <main id="portal-main" className="portal-main-wide">
        {children}
      </main>
    </div>
  );
}

export function PortalSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          {description ? (
            <p className="portal-page-description mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
