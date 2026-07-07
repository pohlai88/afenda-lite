import type { ReactNode } from "react";
import { LayoutDashboardIcon, UserCircleIcon } from "lucide-react";
import {
  CLIENT_SIDEBAR_ROUTES,
  clientRouteUsesSidebar,
  isClientSidebarHref,
} from "@/lib/portal-nav-routes";
import { portalCopy } from "@/lib/portal-copy";

export type ClientNavItem = {
  id: string;
  title: string;
  url: string;
  icon: ReactNode;
};

const clientRouteIcons: Record<string, ReactNode> = {
  "client-dashboard": (
    <LayoutDashboardIcon aria-hidden="true" className="size-4" />
  ),
  "declarant-profile": (
    <UserCircleIcon aria-hidden="true" className="size-4" />
  ),
};

function resolveClientSidebarTitle(
  route: (typeof CLIENT_SIDEBAR_ROUTES)[number],
) {
  const { copy } = route;
  if (copy.section === "clientNav") {
    return portalCopy.clientNav[copy.key];
  }
  if (copy.section === "clientDashboard") {
    return portalCopy.clientDashboard.title;
  }
  return "";
}

export function getClientNavItems(): ClientNavItem[] {
  return CLIENT_SIDEBAR_ROUTES.map((route) => ({
    id: route.id,
    title: resolveClientSidebarTitle(route),
    url: route.href,
    icon: clientRouteIcons[route.id] ?? (
      <LayoutDashboardIcon aria-hidden="true" className="size-4" />
    ),
  }));
}

export function isClientNavItemActive(pathname: string, url: string) {
  return isClientSidebarHref(pathname, url);
}

export { clientRouteUsesSidebar };
