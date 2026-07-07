import type { ReactNode } from "react";
import { PortalBrandMark } from "@/components/portal-brand-mark";
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
} from "@/lib/portal-nav-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export type DashboardTeam = {
  name: string;
  plan: string;
  href: string;
  logo: ReactNode;
  matchPrefixes: string[];
  /** When true, switching to this team runs the preview-client server action. */
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

export const dashboardTeams: DashboardTeam[] = [
  {
    name: PORTAL_NAME,
    plan: portalCopy.nav.organization,
    href: "/dashboard",
    logo: <PortalBrandMark size="xs" className="size-full" />,
    matchPrefixes: ["/dashboard", "/org", "/auth/admin", "/playground"],
  },
  {
    name: "Client portal",
    plan: "Declarations",
    href: "/client",
    logo: <UsersIcon aria-hidden="true" className="size-4" />,
    matchPrefixes: ["/client", "/invite", "/f/"],
    usePreviewAction: true,
  },
];

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
      <PortalBrandMark size="xs" className="size-4 rounded-md" />
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
