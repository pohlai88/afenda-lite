import type { ReactNode } from "react";
import {
  Building2Icon,
  LayoutGridIcon,
  UsersIcon,
} from "lucide-react";
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

export type DashboardNavItem = {
  title: string;
  url: string;
  /** When true, opens the client portal via preview action instead of a direct link. */
  usePreviewAction?: boolean;
};

export type DashboardNavGroup = {
  title: string;
  icon: ReactNode;
  items: DashboardNavItem[];
};

const { nav } = portalCopy;

export const dashboardTeams: DashboardTeam[] = [
  {
    name: PORTAL_NAME,
    plan: nav.organization,
    href: "/dashboard",
    logo: <Building2Icon aria-hidden="true" className="size-4" />,
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

/** Operator routes that exist in the app router (no auth/account dev catalog). */
const operatorNavItems: DashboardNavItem[] = [
  { title: nav.declarations, url: "/dashboard" },
  { title: nav.clientInvitations, url: "/dashboard/clients" },
  { title: portalCopy.orgSignIn.title, url: "/org/login" },
  { title: "Admin auth", url: "/auth/admin" },
];

export function getDashboardNavGroups(options?: {
  showPlayground?: boolean;
}): DashboardNavGroup[] {
  const items = [...operatorNavItems];

  if (options?.showPlayground) {
    items.splice(2, 0, {
      title: nav.playground,
      url: "/playground",
    });
  }

  return [
    {
      title: nav.organization,
      icon: <Building2Icon aria-hidden="true" className="size-4" />,
      items,
    },
  ];
}

export function isNavItemActive(pathname: string, url: string) {
  if (url === "/") {
    return pathname === "/";
  }

  if (url === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      (pathname.startsWith("/dashboard/") &&
        !pathname.startsWith("/dashboard/clients"))
    );
  }

  if (url === "/playground") {
    return (
      pathname === "/playground" || pathname.startsWith("/playground/")
    );
  }

  return pathname === url || pathname.startsWith(`${url}/`);
}

export function isNavGroupActive(pathname: string, group: DashboardNavGroup) {
  return group.items.some((item) => isNavItemActive(pathname, item.url));
}

export function resolveActiveTeam(pathname: string, teams: DashboardTeam[]) {
  return (
    teams.find((team) =>
      team.matchPrefixes.some((prefix) => pathname.startsWith(prefix)),
    ) ?? teams[0]
  );
}

export function getDashboardQuickLinks(options?: { showPlayground?: boolean }) {
  const links: {
    title: string;
    url: string;
    icon: ReactNode;
  }[] = [
    {
      title: nav.declarations,
      url: "/dashboard",
      icon: <Building2Icon aria-hidden="true" className="size-4" />,
    },
    {
      title: nav.clientInvitations,
      url: "/dashboard/clients",
      icon: <UsersIcon aria-hidden="true" className="size-4" />,
    },
  ];

  if (options?.showPlayground) {
    links.push({
      title: nav.playground,
      url: "/playground",
      icon: <LayoutGridIcon aria-hidden="true" className="size-4" />,
    });
  }

  return links;
}
