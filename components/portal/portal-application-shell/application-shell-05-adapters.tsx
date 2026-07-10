import type { ReactElement, ReactNode } from "react";
import { LayoutGridIcon } from "lucide-react";

import { SidebarBrandIcon, SidebarBrandMark } from "@/components/portal/portal-brand-mark";
import type { PortalBreadcrumb } from "@/components/portal/portal-breadcrumb-list";
import {
  applicationShell05NextLink,
  type ApplicationShell05BreadcrumbItem,
  type ApplicationShell05FooterConfig,
  type ApplicationShell05NavGroup,
  type ApplicationShell05NavItem,
  type ApplicationShell05SidebarConfig,
  type ApplicationShell05User,
} from "@/components/V2/application-shell-5";
import {
  getOrgOperatorSidebarItems,
  isNavItemActive,
  type DashboardTeam,
} from "@/lib/dashboard-nav";
import { getClientNavItems, isClientNavItemActive } from "@/lib/client-nav";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import type { PlaygroundScreen } from "@/lib/playground/playground";
import {
  PLAYGROUND_HITL_REVIEW_HREF,
  PLAYGROUND_HREF,
} from "@/lib/playground/playground-nav";
import { memberInitials, type PortalMember } from "@/lib/portal-member-types";
import { playgroundScreenHref } from "@/lib/routing/portal-routes";
import { FooterIdentityMark } from "./portal-shell-footer";

export function toShellBreadcrumbs(
  items: PortalBreadcrumb[],
): ApplicationShell05BreadcrumbItem[] {
  return items.map(({ label, href }) => ({ label, href }));
}

export function portalMemberToShellUser(member: PortalMember): ApplicationShell05User {
  return {
    name: member.displayName,
    role: member.role ?? member.subtitle,
    email: member.email,
    avatarFallback: memberInitials(member.displayName, member.email),
  };
}

export function buildPortalShellFooterConfig(input?: {
  breadcrumbs?: PortalBreadcrumb[];
}): ApplicationShell05FooterConfig {
  return {
    leading: <FooterIdentityMark />,
    breadcrumbs: toShellBreadcrumbs(input?.breadcrumbs ?? []),
  };
}

export function buildOrgAdminSidebarConfig(input: {
  pathname: string;
  showPlayground?: boolean;
  sidebarHeader?: ReactNode;
  navActions?: ReactNode;
  footer?: ReactNode;
}): ApplicationShell05SidebarConfig {
  const { nav } = portalCopy;
  const items = getOrgOperatorSidebarItems({ showPlayground: input.showPlayground });

  return {
    brand: {
      title: PORTAL_NAME,
      href: "/dashboard",
      logo: <SidebarBrandMark />,
    },
    sidebarHeader: input.sidebarHeader,
    navGroups: [
      {
        id: "organization",
        label: nav.organization,
        items: items.map((item) => ({
          id: item.id,
          label: item.title,
          href: item.url,
          icon: item.icon as ReactElement,
          isActive: isNavItemActive(input.pathname, item.url),
        })),
      },
    ],
    navActions: input.navActions,
    footer: input.footer,
    renderLink: applicationShell05NextLink,
  };
}

export function buildOrgUserSidebarConfig(input: {
  pathname: string;
  member: PortalMember | null;
  footer?: ReactNode;
}): ApplicationShell05SidebarConfig {
  const { clientNav } = portalCopy;

  return {
    brand: {
      title: input.member?.displayName ?? PORTAL_NAME,
      href: "/client",
      logo: <SidebarBrandIcon />,
    },
    navGroups: [
      {
        id: "client",
        label: clientNav.sectionLabel,
        items: getClientNavItems().map((item) => ({
          id: item.id,
          label: item.title,
          href: item.url,
          icon: item.icon as ReactElement,
          isActive: isClientNavItemActive(input.pathname, item.url),
        })),
      },
    ],
    footer: input.footer,
    renderLink: applicationShell05NextLink,
  };
}

function playgroundItems(
  screens: PlaygroundScreen[],
  pathname: string,
): ApplicationShell05NavItem[] {
  const activeId = pathname.startsWith("/playground/")
    ? pathname.replace("/playground/", "").split("/")[0]
    : undefined;

  return screens.map((screen) => ({
    id: screen.id,
    label: screen.label,
    href: playgroundScreenHref(screen.id),
    icon: <LayoutGridIcon aria-hidden="true" className="size-4" />,
    isActive: screen.id === activeId,
  }));
}

export function buildDeveloperSidebarConfig(input: {
  pathname: string;
  screens: {
    admin: PlaygroundScreen[];
    client: PlaygroundScreen[];
    dynamic: PlaygroundScreen[];
  };
  footer?: ReactNode;
}): ApplicationShell05SidebarConfig {
  const hitlActive = input.pathname === PLAYGROUND_HITL_REVIEW_HREF;

  return {
    brand: {
      title: "Playground",
      href: PLAYGROUND_HREF,
      logo: <LayoutGridIcon aria-hidden="true" className="size-8" />,
    },
    navGroups: [
      {
        id: "review",
        label: "Review",
        items: [
          {
            id: "hitl-review",
            label: "HITL route checklist",
            href: PLAYGROUND_HITL_REVIEW_HREF,
            icon: <LayoutGridIcon aria-hidden="true" className="size-4" />,
            isActive: hitlActive,
          },
        ],
      },
      {
        id: "admin",
        label: "Admin",
        items: playgroundItems(input.screens.admin, input.pathname),
      },
      {
        id: "client",
        label: "Client",
        items: playgroundItems(input.screens.client, input.pathname),
      },
      {
        id: "dynamic",
        label: "Dynamic routes",
        items: playgroundItems(input.screens.dynamic, input.pathname),
      },
    ],
    footer: input.footer,
    renderLink: applicationShell05NextLink,
  };
}

export type { DashboardTeam };
