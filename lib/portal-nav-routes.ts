/**
 * Canonical portal sidebar routes — single source of truth.
 * Do not duplicate these hrefs in sidebars, breadcrumbs, or nav helpers.
 * Run `npm run check:nav` after any change.
 */

export type PortalNavCopyRef =
  | { section: "nav"; key: "declarations" | "clientInvitations" | "playground" }
  | { section: "clientNav"; key: "declarantProfile" }
  | { section: "clientDashboard"; key: "title" };

export type PortalSidebarRoute = {
  id: string;
  href: string;
  page: string;
  copy: PortalNavCopyRef;
};

/** Operator org sidebar — production routes only (no auth/dev pages). */
export const ORG_OPERATOR_SIDEBAR_ROUTES = [
  {
    id: "declarations",
    href: "/dashboard",
    page: "app/dashboard/page.tsx",
    copy: { section: "nav", key: "declarations" },
  },
  {
    id: "client-invitations",
    href: "/dashboard/clients",
    page: "app/dashboard/clients/page.tsx",
    copy: { section: "nav", key: "clientInvitations" },
  },
] as const satisfies readonly PortalSidebarRoute[];

/** Shown only when PLAYGROUND_ENABLED=true. */
export const ORG_OPERATOR_PLAYGROUND_ROUTE = {
  id: "playground",
  href: "/playground",
  page: "app/playground/page.tsx",
  copy: { section: "nav", key: "playground" },
} as const satisfies PortalSidebarRoute;

/** Client portal sidebar. Declarant profile is /client/profile — never onboarding. */
export const CLIENT_SIDEBAR_ROUTES = [
  {
    id: "client-dashboard",
    href: "/client",
    page: "app/client/page.tsx",
    copy: { section: "clientDashboard", key: "title" },
  },
  {
    id: "declarant-profile",
    href: "/client/profile",
    page: "app/client/profile/page.tsx",
    copy: { section: "clientNav", key: "declarantProfile" },
  },
] as const satisfies readonly PortalSidebarRoute[];

/** Routes that must never appear as sidebar links for the given id. */
export const SIDEBAR_ROUTE_FORBIDDEN_ALIASES: Record<string, readonly string[]> =
  {
    "declarant-profile": ["/client/onboarding"],
  };

export function isOrgOperatorSidebarHref(pathname: string, href: string) {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      (pathname.startsWith("/dashboard/") &&
        !pathname.startsWith("/dashboard/clients"))
    );
  }

  if (href === "/playground") {
    return pathname === "/playground" || pathname.startsWith("/playground/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isClientSidebarHref(pathname: string, href: string) {
  if (href === "/client") {
    return pathname === "/client" || pathname.startsWith("/client/declare/");
  }

  if (href === "/client/profile") {
    return pathname === "/client/profile";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function clientRouteUsesSidebar(pathname: string) {
  return (
    pathname === "/client" ||
    pathname === "/client/profile" ||
    pathname.startsWith("/client/declare/")
  );
}
