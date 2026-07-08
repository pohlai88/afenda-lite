import type { ReactNode } from "react";
import {
  PortalBreadcrumbList,
  type PortalBreadcrumb,
} from "@/components/portal-breadcrumb-list";
import { Separator } from "@/components/ui/separator";
import { SidebarTriggerOptional } from "@/components/ui/sidebar";
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
        "portal-page-toolbar",
        sticky && "portal-page-toolbar-sticky",
      )}
    >
      <SidebarTriggerOptional enabled={showSidebarTrigger} className="-ml-1 shrink-0" />
      {breadcrumbs?.length ? (
        <>
          <Separator
            orientation="vertical"
            className="mr-2 shrink-0 data-[orientation=vertical]:h-4"
          />
          <div className="min-w-0 flex-1">
            <PortalBreadcrumbList items={breadcrumbs} hideFirstOnMobile />
          </div>
        </>
      ) : null}
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
