import type { ReactNode } from "react";
import { SidebarBrandMark } from "@/components/portal/portal-brand-mark";
import { PORTAL_BRAND_SHELL } from "@/lib/copy/portal-brand";
import type { PortalMember } from "@/lib/portal-member-types";
import {
  ClipboardListIcon,
  LayoutGridIcon,
  UsersIcon,
} from "lucide-react";
import {
  ORG_OPERATOR_PLAYGROUND_ROUTE,
  ORG_OPERATOR_SIDEBAR_ROUTES,
  isOrgOperatorSidebarHref,
  type PortalSidebarRoute,
} from "@/lib/routing/portal-nav-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { fallbackOperatorMember } from "@/lib/portal-member-types";

export type DashboardTeam = {
  name: string;
  memberLabel: string;
  memberEmail?: string | null;
  plan: string;
  href: string;
  logo: ReactNode;
  matchPrefixes: string[];
  usePreviewAction?: boolean;
};

export type DashboardSidebarItem = {
  id: string;
  title: string;
  url: string;
  icon: ReactNode;
};

const orgRouteIcons: Record<string, ReactNode> = {
  declarations: <ClipboardListIcon aria-hidden="true" className="size-4" />,
  "client-invitations": <UsersIcon aria-hidden="true" className="size-4" />,
  playground: <LayoutGridIcon aria-hidden="true" className="size-4" />,
};

const operatorLogo = <SidebarBrandMark />;
const clientLogo = (
  <div className={PORTAL_BRAND_SHELL.slot}>
    <UsersIcon aria-hidden="true" className="size-4" />
  </div>
);

export function buildDashboardTeams(input: {
  operator: PortalMember;
  previewClient: PortalMember | null;
}): DashboardTeam[] {
  const { operator, previewClient } = input;

  return [
    {
      name: "operator",
      memberLabel: operator.displayName,
      memberEmail: operator.email,
      plan: portalCopy.nav.organization,
      href: "/dashboard",
      logo: operatorLogo,
      matchPrefixes: ["/dashboard", "/org", "/auth/admin", "/playground"],
    },
    {
      name: "client-preview",
      memberLabel: previewClient?.displayName ?? "Client portal",
      memberEmail: previewClient?.email ?? null,
      plan: previewClient?.subtitle ?? "Declarations",
      href: "/client",
      logo: clientLogo,
      matchPrefixes: ["/client"],
      usePreviewAction: true,
    },
  ];
}

function resolveOrgSidebarTitle(route: PortalSidebarRoute) {
  const { copy } = route;
  if (copy.section === "nav") {
    return portalCopy.nav[copy.key];
  }
  return "";
}

export function getOrgOperatorSidebarItems(options?: {
  showPlayground?: boolean;
}): DashboardSidebarItem[] {
  const routes: PortalSidebarRoute[] = [...ORG_OPERATOR_SIDEBAR_ROUTES];
  if (options?.showPlayground) {
    routes.push(ORG_OPERATOR_PLAYGROUND_ROUTE);
  }

  return routes.map((route) => ({
    id: route.id,
    title: resolveOrgSidebarTitle(route),
    url: route.href,
    icon: orgRouteIcons[route.id] ?? (
      <ClipboardListIcon aria-hidden="true" className="size-4" />
    ),
  }));
}

export function isNavItemActive(pathname: string, url: string) {
  return isOrgOperatorSidebarHref(pathname, url);
}

export function resolveActiveTeam(pathname: string, teams: DashboardTeam[]) {
  return (
    teams.find((team) =>
      team.matchPrefixes.some((prefix) => pathname.startsWith(prefix)),
    ) ?? teams[0]
  );
}

/** Static fallback when dashboard layout has not resolved live member teams yet. */
export const fallbackDashboardTeams: DashboardTeam[] = buildDashboardTeams({
  operator: fallbackOperatorMember(PORTAL_NAME),
  previewClient: null,
});
