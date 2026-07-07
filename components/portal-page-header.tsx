import type { ReactNode } from "react";
import {
  PortalBreadcrumbList,
  type PortalBreadcrumb,
} from "@/components/portal-breadcrumb-list";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type { PortalBreadcrumb };

export function PortalPageHeader({
  breadcrumbs,
  actions,
  showSidebarTrigger = true,
  sticky = false,
}: {
  breadcrumbs?: PortalBreadcrumb[];
  actions?: ReactNode;
  showSidebarTrigger?: boolean;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b px-4",
        sticky &&
          "sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
    >
      {showSidebarTrigger ? (
        <SidebarTrigger className="-ml-1" />
      ) : (
        <Skeleton className="-ml-1 size-8 shrink-0 rounded-md" aria-hidden />
      )}
      {breadcrumbs?.length ? (
        <>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <PortalBreadcrumbList items={breadcrumbs} hideFirstOnMobile />
        </>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
