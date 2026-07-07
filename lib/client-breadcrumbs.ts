import { portalCopy } from "@/lib/portal-copy";
import type { PortalBreadcrumb } from "@/components/portal-breadcrumb-list";

export function clientDashboardBreadcrumb(): PortalBreadcrumb {
  return {
    label: portalCopy.clientDashboard.title,
    href: "/client",
  };
}

export function clientDeclarationBreadcrumbs(
  surveyTitle: string,
): PortalBreadcrumb[] {
  return [clientDashboardBreadcrumb(), { label: surveyTitle }];
}

export function clientProfileBreadcrumbs(): PortalBreadcrumb[] {
  return [
    clientDashboardBreadcrumb(),
    { label: portalCopy.clientNav.declarantProfile },
  ];
}
