"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarSkeleton } from "@/components/app-sidebar-skeleton";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMounted } from "@/hooks/use-mounted";

export function DashboardShell({
  children,
  showPreviewClient = false,
  showPlayground = false,
  sidebar,
}: {
  children: ReactNode;
  showPreviewClient?: boolean;
  showPlayground?: boolean;
  sidebar?: ReactNode;
}) {
  const mounted = useMounted();

  return (
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
              showPreviewClient={showPreviewClient}
              showPlayground={showPlayground}
            />
          ) : (
            <AppSidebarSkeleton />
          ))}
        <SidebarInset className="min-h-svh">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
