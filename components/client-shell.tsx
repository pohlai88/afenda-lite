"use client";

import type { ReactNode } from "react";
import { ClientSidebar } from "@/components/client-sidebar";
import { PortalMemberProvider } from "@/components/portal-member-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { PortalMember } from "@/lib/portal-member-types";

export function ClientShell({
  children,
  member = null,
}: {
  children: ReactNode;
  member?: PortalMember | null;
}) {
  return (
    <PortalMemberProvider member={member}>
      <TooltipProvider delay={0}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "16rem",
            } as React.CSSProperties
          }
        >
          <ClientSidebar />
          <SidebarInset className="flex min-h-svh min-w-0 flex-col overflow-x-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </PortalMemberProvider>
  );
}
