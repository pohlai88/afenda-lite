import type { ReactNode } from "react";
import { PortalPageIntro } from "@/components/portal/portal-page-intro";
import type { PortalBreadcrumb } from "@/components/portal/portal-breadcrumb-list";
import { PortalShellHeader } from "./portal-shell-header-context";
import { toShellBreadcrumbs } from "./application-shell-05-adapters";

export function PortalWorkspacePageSkeleton({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  breadcrumbs?: PortalBreadcrumb[];
  children: ReactNode;
}) {
  return (
    <>
      {breadcrumbs?.length ? (
        <PortalShellHeader breadcrumbs={toShellBreadcrumbs(breadcrumbs)} />
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 md:gap-8">
        <PortalPageIntro eyebrow={eyebrow} title={title} description={description} />
        {children}
      </div>
    </>
  );
}
