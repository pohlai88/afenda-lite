import type { PortalBreadcrumb } from "@/components/portal/portal-breadcrumb-list";
import { portalCopy } from "@/lib/copy/portal-copy";
import { OPERATOR_DASHBOARD_HREF } from "@/lib/routing/portal-routes";

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
