"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarSkeleton } from "@/components/app-sidebar-skeleton";
import { PortalMemberProvider } from "@/components/portal-member-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/use-mounted";
import type { DashboardTeam } from "@/lib/dashboard-nav";
import type { PortalMember } from "@/lib/portal-member-types";

export function DashboardShell({
  children,
  operatorMember = null,
  dashboardTeams,
  showPreviewClient = false,
  showPlayground = false,
  sidebar,
}: {
  children: ReactNode;
  operatorMember?: PortalMember | null;
  dashboardTeams?: DashboardTeam[];
  showPreviewClient?: boolean;
  showPlayground?: boolean;
  sidebar?: ReactNode;
}) {
  const mounted = useMounted();

  return (
    <PortalMemberProvider member={operatorMember}>
      <TooltipProvider delay={0}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "16rem",
            } as React.CSSProperties
          }
        >
          {sidebar ??
            (mounted ? (
              <AppSidebar
                teams={dashboardTeams}
                showPreviewClient={showPreviewClient}
                showPlayground={showPlayground}
              />
            ) : (
              <AppSidebarSkeleton />
            ))}
          <SidebarInset className="flex min-h-svh min-w-0 flex-col overflow-x-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </PortalMemberProvider>
  );
}
