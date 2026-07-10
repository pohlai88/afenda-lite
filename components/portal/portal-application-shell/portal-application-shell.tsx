"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ApplicationShell05Page } from "@/components/V2/application-shell-5";
import { ApplicationShell05Layout } from "@/components/V2/application-shell-5/application-shell-05-layout";
import { PortalMemberProvider } from "@/components/portal/portal-member-context";
import { TeamSwitcher } from "@/components/team-switcher";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMounted } from "@/components/hooks/use-mounted";
import type { PlaygroundScreen } from "@/lib/playground/playground";
import type { PortalMember } from "@/lib/portal-member-types";

import { ApplicationShell05SidebarSkeleton } from "./application-shell-sidebar-skeleton";
import { OperatorPreviewClientNavAction } from "./operator-preview-client-nav-action";
import { PortalShellSidebarFooter } from "./portal-shell-sidebar-footer";
import {
  PortalShellHeaderProvider,
  usePortalShellHeader,
} from "./portal-shell-header-context";
import {
  buildDeveloperSidebarConfig,
  buildOrgAdminSidebarConfig,
  buildOrgUserSidebarConfig,
  buildPortalShellFooterConfig,
  portalMemberToShellUser,
  type DashboardTeam,
} from "./application-shell-05-adapters";

export type PortalNavVariant = "orgAdmin" | "orgUser" | "developer";

export type PortalApplicationShellProps = {
  children: ReactNode;
  navVariant: PortalNavVariant;
  member?: PortalMember | null;
  teams?: DashboardTeam[];
  showPreviewClient?: boolean;
  showPlayground?: boolean;
  developerScreens?: {
    admin: PlaygroundScreen[];
    client: PlaygroundScreen[];
    dynamic: PlaygroundScreen[];
  };
  embed?: boolean;
};

function PortalApplicationShellInner({
  children,
  navVariant,
  member = null,
  teams,
  showPreviewClient = false,
  showPlayground = false,
  developerScreens,
}: Omit<PortalApplicationShellProps, "embed">) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { header } = usePortalShellHeader();
  const profileUser = member ? portalMemberToShellUser(member) : undefined;
  const footer = <PortalShellSidebarFooter />;
  const shellFooter = buildPortalShellFooterConfig({ breadcrumbs: header?.breadcrumbs });
  const shellHeader = header?.greeting ? { greeting: header.greeting } : undefined;

  const sidebarConfig = (() => {
    if (navVariant === "orgAdmin") {
      return buildOrgAdminSidebarConfig({
        pathname,
        showPlayground,
        sidebarHeader: teams ? <TeamSwitcher teams={teams} /> : undefined,
        navActions: showPreviewClient ? <OperatorPreviewClientNavAction /> : undefined,
        footer,
      });
    }

    if (navVariant === "orgUser") {
      return buildOrgUserSidebarConfig({
        pathname,
        member,
        footer,
      });
    }

    return buildDeveloperSidebarConfig({
      pathname,
      screens: developerScreens ?? { admin: [], client: [], dynamic: [] },
      footer,
    });
  })();

  if (!mounted) {
    return (
      <ApplicationShell05Layout
        sidebar={<ApplicationShell05SidebarSkeleton />}
        profileUser={profileUser}
        header={shellHeader}
        footer={shellFooter}
        showStudioChrome={false}
      >
        {children}
      </ApplicationShell05Layout>
    );
  }

  return (
    <ApplicationShell05Page
      sidebarConfig={sidebarConfig}
      profileUser={profileUser}
      header={shellHeader}
      footer={shellFooter}
      showStudioChrome={false}
    >
      {children}
    </ApplicationShell05Page>
  );
}

export function PortalApplicationShell({
  children,
  embed = false,
  member = null,
  ...props
}: PortalApplicationShellProps) {
  if (embed) {
    return <>{children}</>;
  }

  return (
    <div className="portal-shell min-h-dvh">
      <PortalMemberProvider member={member}>
        <TooltipProvider delay={0}>
          <PortalShellHeaderProvider>
            <PortalApplicationShellInner member={member} {...props}>
              {children}
            </PortalApplicationShellInner>
          </PortalShellHeaderProvider>
        </TooltipProvider>
      </PortalMemberProvider>
    </div>
  );
}
