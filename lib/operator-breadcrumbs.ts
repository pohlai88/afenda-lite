import type { PortalBreadcrumb } from "@/components/portal-breadcrumb-list";
import { portalCopy } from "@/lib/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/portal-routes";

export function operatorDashboardBreadcrumbs(): PortalBreadcrumb[] {
  return [{ label: portalCopy.nav.declarations }];
}

export function operatorClientsBreadcrumbs(): PortalBreadcrumb[] {
  return [
    { label: portalCopy.nav.declarations, href: OPERATOR_DASHBOARD_HREF },
    { label: portalCopy.nav.clientInvitations },
  ];
}

export function operatorDeclarationBreadcrumbs(
  title: string,
): PortalBreadcrumb[] {
  return [
    { label: portalCopy.nav.declarations, href: OPERATOR_DASHBOARD_HREF },
    { label: title },
  ];
}
