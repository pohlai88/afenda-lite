import type { ReactNode } from "react";
import Link from "next/link";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { Button } from "@/components/ui/button";
import { PORTAL_NAME } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";

type PortalNarrowShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  centered?: boolean;
};

export function PortalNarrowShell({
  children,
  backHref,
  backLabel = "Back",
  className,
  centered = false,
}: PortalNarrowShellProps) {
  return (
    <div className="portal-shell flex min-h-dvh flex-col">
      <header className="portal-header">
        <div className="portal-header-inner max-w-lg">
          <p className="truncate text-sm font-semibold" translate="no">
            {PORTAL_NAME}
          </p>
          <PortalThemeToggle />
        </div>
      </header>
      <main
        className={cn(
          "portal-main-narrow flex flex-1 flex-col",
          centered && "justify-center",
          className,
        )}
      >
        {backHref ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 w-fit px-2 text-muted-foreground"
            render={<Link href={backHref} />}
            nativeButton={false}
          >
            {backLabel}
          </Button>
        ) : null}
        {children}
      </main>
    </div>
  );
}
