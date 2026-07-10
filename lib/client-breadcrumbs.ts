import { portalCopy } from "@/lib/copy/portal-copy";
import type { PortalBreadcrumb } from "@/lib/portal-breadcrumb";

export function clientDashboardBreadcrumb(): PortalBreadcrumb {
  return {
    label: portalCopy.clientDashboard.title,
    href: "/client",
  };
}

export function clientDeclarationBreadcrumbs(
  surveyTitle: string,
): PortalBreadcrumb[] {
  return [
    {
      label: portalCopy.clientDashboard.backToAssignments,
      href: "/client",
    },
    { label: surveyTitle },
  ];
}

export function clientProfileBreadcrumbs(): PortalBreadcrumb[] {
  return [
    clientDashboardBreadcrumb(),
    { label: portalCopy.clientNav.declarantProfile },
  ];
}
